import { z } from 'zod'
import { router, adminProcedure, protectedProcedure } from '../trpc/init'
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
            return prisma.paymentMethod.update({ where: { id }, data })
        }),

    /**
     * Delete payment method (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await prisma.paymentMethod.update({
                where: { id: input.id },
                data: { isActive: false },
            })
            return { success: true }
        }),
})
