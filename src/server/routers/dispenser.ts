import { z } from 'zod'
import { router, adminProcedure, tenantProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'

export const dispenserRouter = router({
    /**
     * Get all dispensers with nozzles for the current station
     */
    getAll: tenantProcedure.query(async ({ ctx }) => {
        return prisma.dispenser.findMany({
            where: {
                stationId: ctx.stationId,
                deletedAt: null
            },
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
     * Get dispenser by ID (tenant-scoped)
     */
    getById: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            return prisma.dispenser.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
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
        .mutation(async ({ ctx, input }) => {
            // Check for duplicate dispenser code within the station
            const existing = await prisma.dispenser.findFirst({
                where: {
                    stationId: ctx.stationId,
                    code: input.code,
                    deletedAt: null
                }
            })
            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Dispenser code "${input.code}" already exists`
                })
            }

            return prisma.dispenser.create({
                data: {
                    ...input,
                    stationId: ctx.stationId,
                }
            })
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
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input

            // Verify dispenser belongs to this station
            const existing = await prisma.dispenser.findFirst({
                where: { id, stationId: ctx.stationId }
            })
            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Dispenser not found'
                })
            }

            return prisma.dispenser.update({ where: { id }, data })
        }),

    /**
     * Delete dispenser (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Check for references (tenant-scoped)
            const dispenser = await prisma.dispenser.findFirst({
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

            if (!dispenser) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Dispenser not found'
                })
            }

            if (dispenser._count.nozzles > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete this dispenser because it still has nozzles. Delete or reassign nozzles first, or deactivate the dispenser.'
                })
            }

            await prisma.dispenser.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),
})
