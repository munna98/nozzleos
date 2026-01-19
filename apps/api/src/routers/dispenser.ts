import { router, protectedProcedure } from '@nozzleos/trpc'
import { prisma } from '@nozzleos/db'
import {
    createDispenserSchema,
    updateDispenserSchema,
} from '@nozzleos/validators'
import { z } from 'zod'

export const dispenserRouter = router({
    /**
     * Get all active dispensers with their nozzles
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.dispenser.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
                nozzles: {
                    include: { fuel: true },
                },
            },
        })
    }),

    /**
     * Get a single dispenser by ID
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
     * Create a new dispenser
     */
    create: protectedProcedure
        .input(createDispenserSchema)
        .mutation(async ({ input }) => {
            return prisma.dispenser.create({
                data: {
                    code: input.code,
                    name: input.name,
                    isActive: input.isActive ?? true,
                },
            })
        }),

    /**
     * Update a dispenser
     */
    update: protectedProcedure
        .input(z.object({ id: z.number(), data: updateDispenserSchema }))
        .mutation(async ({ input }) => {
            return prisma.dispenser.update({
                where: { id: input.id },
                data: {
                    code: input.data.code,
                    name: input.data.name,
                    isActive: input.data.isActive,
                },
                include: { nozzles: true },
            })
        }),

    /**
     * Soft delete a dispenser
     */
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return prisma.dispenser.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), isActive: false },
            })
        }),
})
