import { z } from 'zod'
import { router, adminProcedure, protectedProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'

export const paymentMethodRouter = router({
    /**
     * Get all payment methods
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.paymentMethod.findMany({
            where: { isActive: true },
            include: { customer: true },
            orderBy: { name: 'asc' },
        })
    }),

    /**
     * Get payment method by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.paymentMethod.findUnique({
                where: { id: input.id },
                include: { customer: true },
            })
        }),

    /**
     * Create payment method (admin only)
     */
    create: adminProcedure
        .input(z.object({
            name: z.string().min(1),
            customerId: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
            return prisma.paymentMethod.create({ data: input })
        }),

    /**
     * Update payment method (admin only)
     */
    update: adminProcedure
        .input(z.object({
            id: z.number(),
            name: z.string().min(1).optional(),
            customerId: z.number().optional().nullable(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...data } = input

            // Prevent deactivating Cash payment method
            if (id === 1 && data.isActive === false) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot deactivate the Cash payment method'
                })
            }

            return prisma.paymentMethod.update({ where: { id }, data })
        }),

    /**
     * Delete payment method (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            if (input.id === 1) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot delete the Cash payment method'
                })
            }

            // Check if there are any session payments using this method
            const sessionPaymentsCount = await prisma.sessionPayment.count({
                where: { paymentMethodId: input.id }
            })

            if (sessionPaymentsCount > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete this payment method because it has been used in Recorded payments. Try deactivating it instead.'
                })
            }

            // Check if this is a customer payment method, if so, we should probably warn or handle it
            // though usually Customer deletion handles it.

            await prisma.paymentMethod.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),
})
