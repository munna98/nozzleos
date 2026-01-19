import { router, protectedProcedure } from '@nozzleos/trpc'
import { prisma } from '@nozzleos/db'
import {
    createNozzleSchema,
    updateNozzleSchema,
    setNozzleAvailabilitySchema,
} from '@nozzleos/validators'
import { z } from 'zod'

export const nozzleRouter = router({
    /**
     * Get all active nozzles
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.nozzle.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: {
                fuel: true,
                dispenser: true,
            },
        })
    }),

    /**
     * Get a single nozzle by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.nozzle.findUnique({
                where: { id: input.id },
                include: {
                    fuel: true,
                    dispenser: true,
                },
            })
        }),

    /**
     * Create a new nozzle
     */
    create: protectedProcedure
        .input(createNozzleSchema)
        .mutation(async ({ input }) => {
            return prisma.nozzle.create({
                data: {
                    code: input.code,
                    dispenserId: input.dispenserId,
                    fuelId: input.fuelId,
                    price: input.price,
                    currentreading: input.currentreading ?? 0,
                    isActive: input.isActive ?? true,
                },
                include: {
                    fuel: true,
                    dispenser: true,
                },
            })
        }),

    /**
     * Update a nozzle
     */
    update: protectedProcedure
        .input(z.object({ id: z.number(), data: updateNozzleSchema }))
        .mutation(async ({ input }) => {
            return prisma.nozzle.update({
                where: { id: input.id },
                data: {
                    code: input.data.code,
                    dispenserId: input.data.dispenserId,
                    fuelId: input.data.fuelId,
                    price: input.data.price,
                    currentreading: input.data.currentreading,
                    isActive: input.data.isActive,
                },
                include: {
                    fuel: true,
                    dispenser: true,
                },
            })
        }),

    /**
     * Set nozzle availability
     */
    setAvailability: protectedProcedure
        .input(z.object({ id: z.number(), data: setNozzleAvailabilitySchema }))
        .mutation(async ({ input }) => {
            return prisma.nozzle.update({
                where: { id: input.id },
                data: { isAvailable: input.data.isAvailable },
                include: {
                    fuel: true,
                    dispenser: true,
                },
            })
        }),

    /**
     * Soft delete a nozzle
     */
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return prisma.nozzle.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), isActive: false },
            })
        }),
})
