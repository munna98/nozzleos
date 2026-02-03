import { z } from 'zod'
import { router, adminProcedure, tenantProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'

export const paymentMethodRouter = router({
    /**
     * Get all payment methods for the current station
     */
    getAll: tenantProcedure.query(async ({ ctx }) => {
        return prisma.paymentMethod.findMany({
            where: {
                stationId: ctx.stationId,
                isActive: true
            },
            include: { customer: true },
            orderBy: { name: 'asc' },
        })
    }),

    /**
     * Get payment method by ID (tenant-scoped)
     */
    getById: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            return prisma.paymentMethod.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
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
        .mutation(async ({ ctx, input }) => {
            // Check for duplicate payment method name within the station
            const existing = await prisma.paymentMethod.findFirst({
                where: {
                    stationId: ctx.stationId,
                    name: input.name
                }
            })
            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Payment method "${input.name}" already exists`
                })
            }

            return prisma.paymentMethod.create({
                data: {
                    ...input,
                    stationId: ctx.stationId,
                }
            })
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
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input

            // Verify payment method belongs to this station
            const existing = await prisma.paymentMethod.findFirst({
                where: { id, stationId: ctx.stationId }
            })
            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Payment method not found'
                })
            }

            // Prevent deactivating Cash payment method
            if (existing.name === 'Cash' && data.isActive === false) {
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
        .mutation(async ({ ctx, input }) => {
            // Verify payment method belongs to this station
            const paymentMethod = await prisma.paymentMethod.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                }
            })

            if (!paymentMethod) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Payment method not found'
                })
            }

            // Prevent deleting Cash payment method
            if (paymentMethod.name === 'Cash') {
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

            await prisma.paymentMethod.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),
})
