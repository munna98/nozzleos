import { z } from 'zod'
import { router, adminProcedure, protectedProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'

export const fuelRouter = router({
    /**
     * Get all fuels
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.fuel.findMany({
            where: { deletedAt: null },
            orderBy: { name: 'asc' },
        })
    }),

    /**
     * Get fuel by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.fuel.findUnique({ where: { id: input.id } })
        }),

    /**
     * Create fuel (admin only)
     */
    create: adminProcedure
        .input(z.object({
            name: z.string().min(1),
            price: z.number().min(0),
        }))
        .mutation(async ({ input }) => {
            return prisma.fuel.create({ data: input })
        }),

    /**
     * Update fuel (admin only)
     */
    update: adminProcedure
        .input(z.object({
            id: z.number(),
            name: z.string().min(1).optional(),
            price: z.number().min(0).optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...data } = input
            return prisma.fuel.update({ where: { id }, data })
        }),

    /**
     * Delete fuel (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await prisma.fuel.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), isActive: false },
            })
            return { success: true }
        }),
})
