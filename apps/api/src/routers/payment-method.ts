import { router, protectedProcedure } from '@nozzleos/trpc'
import { prisma } from '@nozzleos/db'
import {
    createPaymentMethodSchema,
    updatePaymentMethodSchema,
} from '@nozzleos/validators'
import { z } from 'zod'

export const paymentMethodRouter = router({
    /**
     * Get all active payment methods
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.paymentMethod.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
        })
    }),

    /**
     * Get a single payment method by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.paymentMethod.findUnique({
                where: { id: input.id },
            })
        }),

    /**
     * Create a new payment method
     */
    create: protectedProcedure
        .input(createPaymentMethodSchema)
        .mutation(async ({ input }) => {
            return prisma.paymentMethod.create({
                data: {
                    name: input.name,
                    isActive: input.isActive ?? true,
                },
            })
        }),

    /**
     * Update a payment method
     */
    update: protectedProcedure
        .input(z.object({ id: z.number(), data: updatePaymentMethodSchema }))
        .mutation(async ({ input }) => {
            return prisma.paymentMethod.update({
                where: { id: input.id },
                data: {
                    name: input.data.name,
                    isActive: input.data.isActive,
                },
            })
        }),

    /**
     * Delete a payment method
     */
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return prisma.paymentMethod.delete({
                where: { id: input.id },
            })
        }),
})
