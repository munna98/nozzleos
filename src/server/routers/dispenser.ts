import { z } from 'zod'
import { router, adminProcedure, protectedProcedure, TRPCError } from '../trpc/init'
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
            // Check for references
            const dispenser = await prisma.dispenser.findUnique({
                where: { id: input.id },
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
