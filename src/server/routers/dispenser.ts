import { z } from 'zod'
import { router, adminProcedure, protectedProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'

export const dispenserRouter = router({
    /**
     * Get all dispensers with nozzles
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.dispenser.findMany({
            where: { deletedAt: null },
            include: {
                nozzles: {
                    where: { deletedAt: null },
                    include: { fuel: true },
                },
            },
            orderBy: { code: 'asc' },
        })
    }),

    /**
     * Get dispenser by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.dispenser.findUnique({
                where: { id: input.id },
                include: {
                    nozzles: {
                        include: { fuel: true },
                    },
                },
            })
        }),

    /**
     * Create dispenser (admin only)
     */
    create: adminProcedure
        .input(z.object({
            code: z.string().min(1),
            name: z.string().min(1),
        }))
        .mutation(async ({ input }) => {
            return prisma.dispenser.create({ data: input })
        }),

    /**
     * Update dispenser (admin only)
     */
    update: adminProcedure
        .input(z.object({
            id: z.number(),
            code: z.string().min(1).optional(),
            name: z.string().min(1).optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...data } = input
            return prisma.dispenser.update({ where: { id }, data })
        }),

    /**
     * Delete dispenser (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await prisma.dispenser.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), isActive: false },
            })
            return { success: true }
        }),
})
