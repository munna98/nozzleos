import { z } from 'zod'
import { router, adminProcedure, tenantProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'

export const productRouter = router({
    /**
     * Get the next auto-generated product code for the current station (starts at 1001)
     */
    getNextCode: tenantProcedure.query(async ({ ctx }) => {
        const products = await prisma.product.findMany({
            where: { stationId: ctx.stationId },
            select: { code: true }
        })

        let maxCode = 1000
        for (const p of products) {
            const trimmed = p.code?.trim() || ''
            if (/^\d+$/.test(trimmed)) {
                const val = parseInt(trimmed, 10)
                if (val > maxCode) {
                    maxCode = val
                }
            }
        }

        return { nextCode: (maxCode + 1).toString() }
    }),

    /**
     * Get all products for the current station
     */
    getAll: tenantProcedure
        .input(
            z.object({
                search: z.string().optional(),
                group: z.string().optional(),
                activeOnly: z.boolean().optional(),
            }).optional()
        )
        .query(async ({ ctx, input }) => {
            const where: Record<string, unknown> = {
                stationId: ctx.stationId,
                deletedAt: null,
            }

            if (input?.group && input.group !== 'all') {
                where.group = input.group
            }

            if (input?.activeOnly) {
                where.isActive = true
            }

            if (input?.search && input.search.trim() !== '') {
                const search = input.search.trim()
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } },
                ]
            }

            return prisma.product.findMany({
                where,
                orderBy: [
                    { code: 'asc' },
                    { name: 'asc' }
                ],
            })
        }),

    /**
     * Get product by ID (tenant-scoped)
     */
    getById: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const product = await prisma.product.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId,
                    deletedAt: null,
                }
            })

            if (!product) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                })
            }

            return product
        }),

    /**
     * Create product (admin / manager)
     */
    create: adminProcedure
        .input(
            z.object({
                code: z.string().trim().optional(),
                name: z.string().trim().min(1, 'Product name is required'),
                unit: z.string().trim().min(1, 'Unit is required'),
                rate: z.number().min(0, 'Rate must be 0 or higher'),
                group: z.string().trim().min(1, 'Group is required'),
                isActive: z.boolean().optional().default(true),
            })
        )
        .mutation(async ({ ctx, input }) => {
            let codeToUse = input.code?.trim()

            // If code is not provided or empty, auto-generate starting from 1001
            if (!codeToUse) {
                const products = await prisma.product.findMany({
                    where: { stationId: ctx.stationId },
                    select: { code: true }
                })

                let maxCode = 1000
                for (const p of products) {
                    const trimmed = p.code?.trim() || ''
                    if (/^\d+$/.test(trimmed)) {
                        const val = parseInt(trimmed, 10)
                        if (val > maxCode) maxCode = val
                    }
                }
                codeToUse = (maxCode + 1).toString()
            }

            // Check for duplicate code in station
            const existing = await prisma.product.findFirst({
                where: {
                    stationId: ctx.stationId,
                    code: codeToUse,
                    deletedAt: null,
                }
            })

            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Product with code "${codeToUse}" already exists`,
                })
            }

            return prisma.product.create({
                data: {
                    stationId: ctx.stationId,
                    code: codeToUse,
                    name: input.name,
                    unit: input.unit,
                    rate: input.rate,
                    group: input.group,
                    isActive: input.isActive ?? true,
                }
            })
        }),

    /**
     * Update product (admin / manager)
     */
    update: adminProcedure
        .input(
            z.object({
                id: z.number(),
                code: z.string().trim().min(1, 'Code cannot be empty').optional(),
                name: z.string().trim().min(1, 'Name cannot be empty').optional(),
                unit: z.string().trim().min(1, 'Unit cannot be empty').optional(),
                rate: z.number().min(0, 'Rate must be 0 or higher').optional(),
                group: z.string().trim().min(1, 'Group cannot be empty').optional(),
                isActive: z.boolean().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input

            const existingProduct = await prisma.product.findFirst({
                where: { id, stationId: ctx.stationId, deletedAt: null }
            })

            if (!existingProduct) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                })
            }

            // If updating code, ensure it doesn't conflict with another active product
            if (data.code && data.code !== existingProduct.code) {
                const codeConflict = await prisma.product.findFirst({
                    where: {
                        stationId: ctx.stationId,
                        code: data.code,
                        id: { not: id },
                        deletedAt: null,
                    }
                })

                if (codeConflict) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Product with code "${data.code}" already exists`,
                    })
                }
            }

            return prisma.product.update({
                where: { id },
                data,
            })
        }),

    /**
     * Delete product (admin / manager)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const product = await prisma.product.findFirst({
                where: { id: input.id, stationId: ctx.stationId }
            })

            if (!product) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                })
            }

            await prisma.product.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),
})
