import { z } from 'zod'
import { router, adminProcedure, protectedProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'

export const nozzleRouter = router({
    /**
     * Get all nozzles with dispenser and fuel info
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.nozzle.findMany({
            where: { deletedAt: null },
            include: {
                dispenser: true,
                fuel: true,
            },
            orderBy: { code: 'asc' },
        })
    }),

    /**
     * Get available nozzles for shift
     */
    getAvailable: protectedProcedure.query(async () => {
        return prisma.nozzle.findMany({
            where: {
                deletedAt: null,
                isActive: true,
                isAvailable: true,
            },
            include: {
                dispenser: true,
                fuel: true,
            },
            orderBy: { code: 'asc' },
        })
    }),

    /**
     * Get nozzle by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.nozzle.findUnique({
                where: { id: input.id },
                include: {
                    dispenser: true,
                    fuel: true,
                },
            })
        }),

    /**
     * Create nozzle (admin only)
     */
    create: adminProcedure
        .input(z.object({
            code: z.string().min(1),
            dispenserId: z.number(),
            fuelId: z.number(),
            price: z.number().min(0),
            currentreading: z.number().min(0).optional(),
        }))
        .mutation(async ({ input }) => {
            return prisma.nozzle.create({
                data: input,
                include: { dispenser: true, fuel: true },
            })
        }),

    /**
     * Update nozzle (admin only)
     */
    update: adminProcedure
        .input(z.object({
            id: z.number(),
            code: z.string().min(1).optional(),
            dispenserId: z.number().optional(),
            fuelId: z.number().optional(),
            price: z.number().min(0).optional(),
            currentreading: z.number().min(0).optional(),
            isActive: z.boolean().optional(),
            isAvailable: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...data } = input
            return prisma.nozzle.update({
                where: { id },
                data,
                include: { dispenser: true, fuel: true },
            })
        }),

    /**
     * Delete nozzle (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            await prisma.nozzle.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), isActive: false },
            })
            return { success: true }
        }),
})
