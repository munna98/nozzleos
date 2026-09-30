import { z } from 'zod'
import { router, adminProcedure, tenantProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'

export const nozzleRouter = router({
    /**
     * Get all nozzles with dispenser and fuel info for the current station
     */
    getAll: tenantProcedure.query(async ({ ctx }) => {
        return prisma.nozzle.findMany({
            where: {
                stationId: ctx.stationId,
                deletedAt: null
            },
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
    getAvailable: tenantProcedure.query(async ({ ctx }) => {
        return prisma.nozzle.findMany({
            where: {
                stationId: ctx.stationId,
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
     * Get nozzle by ID (tenant-scoped)
     */
    getById: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            return prisma.nozzle.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
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
        .mutation(async ({ ctx, input }) => {
            // Check for duplicate nozzle code within the station
            const existing = await prisma.nozzle.findFirst({
                where: {
                    stationId: ctx.stationId,
                    code: input.code,
                    deletedAt: null
                }
            })
            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Nozzle code "${input.code}" already exists`
                })
            }

            return prisma.nozzle.create({
                data: {
                    ...input,
                    stationId: ctx.stationId,
                },
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
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input

            // Verify nozzle belongs to this station
            const existing = await prisma.nozzle.findFirst({
                where: { id, stationId: ctx.stationId }
            })
            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Nozzle not found'
                })
            }

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
        .mutation(async ({ ctx, input }) => {
            // Check for references (tenant-scoped)
            const nozzle = await prisma.nozzle.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
                include: {
                    _count: {
                        select: { nozzleSessionReadings: true }
                    }
                }
            })

            if (!nozzle) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Nozzle not found'
                })
            }

            if (nozzle._count.nozzleSessionReadings > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete this nozzle because it has historical readings. Try deactivating it instead.'
                })
            }

            await prisma.nozzle.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),
})
