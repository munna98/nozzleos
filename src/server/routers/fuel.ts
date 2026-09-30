import { z } from 'zod'
import { router, adminProcedure, tenantProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'

export const fuelRouter = router({
    /**
     * Get all fuels for the current station
     */
    getAll: tenantProcedure.query(async ({ ctx }) => {
        return prisma.fuel.findMany({
            where: {
                stationId: ctx.stationId,
                deletedAt: null
            },
            orderBy: { name: 'asc' },
        })
    }),

    /**
     * Get fuel by ID (tenant-scoped)
     */
    getById: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            return prisma.fuel.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                }
            })
        }),

    /**
     * Create fuel (admin only)
     */
    create: adminProcedure
        .input(z.object({
            name: z.string().min(1),
            price: z.number().min(0),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check for duplicate fuel name within the station
            const existing = await prisma.fuel.findFirst({
                where: {
                    stationId: ctx.stationId,
                    name: input.name,
                    deletedAt: null
                }
            })
            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Fuel "${input.name}" already exists`
                })
            }

            return prisma.fuel.create({
                data: {
                    ...input,
                    stationId: ctx.stationId,
                }
            })
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
            syncNozzlePrices: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, syncNozzlePrices, ...data } = input

            // Verify fuel belongs to this station
            const existingFuel = await prisma.fuel.findFirst({
                where: { id, stationId: ctx.stationId }
            })
            if (!existingFuel) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Fuel not found'
                })
            }

            const updatedFuel = await prisma.fuel.update({ where: { id }, data })

            if (syncNozzlePrices && data.price !== undefined) {
                await prisma.nozzle.updateMany({
                    where: {
                        fuelId: id,
                        stationId: ctx.stationId,
                        deletedAt: null
                    },
                    data: { price: data.price }
                })
            }

            return updatedFuel
        }),

    /**
     * Delete fuel (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Check for references (tenant-scoped)
            const fuel = await prisma.fuel.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
                include: {
                    _count: {
                        select: { nozzles: true }
                    }
                }
            })

            if (!fuel) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Fuel not found'
                })
            }

            if (fuel._count.nozzles > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete this fuel because it is linked to nozzles. Try deactivating it instead.'
                })
            }

            await prisma.fuel.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),
})
