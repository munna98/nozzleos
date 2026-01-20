import { router, protectedProcedure } from '@nozzleos/trpc'
import { prisma } from '@nozzleos/db'
import {
    createFuelSchema,
    updateFuelSchema,
} from '@nozzleos/validators'
import { z } from 'zod'

export const fuelRouter = router({
    /**
     * Get all active fuels
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.fuel.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
        })
    }),

    /**
     * Get a single fuel by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.fuel.findUnique({
                where: { id: input.id },
                include: { nozzles: true },
            })
        }),

    /**
     * Create a new fuel
     */
    create: protectedProcedure
        .input(createFuelSchema)
        .mutation(async ({ input }) => {
            return prisma.fuel.create({
                data: {
                    name: input.name,
                    price: input.price,
                    isActive: input.isActive ?? true,
                },
            })
        }),

    /**
     * Update a fuel and cascade price to nozzles
     */
    update: protectedProcedure
        .input(z.object({ id: z.number(), data: updateFuelSchema }))
        .mutation(async ({ input }) => {
            return prisma.$transaction(async (tx: any) => {
                const fuel = await tx.fuel.update({
                    where: { id: input.id },
                    data: {
                        name: input.data.name,
                        price: input.data.price,
                        isActive: input.data.isActive,
                    },
                })

                // Cascade price update to nozzles
                if (input.data.price !== undefined) {
                    await tx.nozzle.updateMany({
                        where: { fuelId: input.id },
                        data: { price: input.data.price },
                    })
                }

                return fuel
            })
        }),

    /**
     * Soft delete a fuel
     */
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return prisma.fuel.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), isActive: false },
            })
        }),
})
