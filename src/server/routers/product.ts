import { z } from 'zod'
import { Prisma } from '@prisma/client'
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

    /**
     * ==================== PRODUCT GROUPS ====================
     */

    /**
     * Get all product groups for the current station (auto-seeds defaults if none exist)
     */
    getGroups: tenantProcedure.query(async ({ ctx }) => {
        let groups = await prisma.productGroup.findMany({
            where: { stationId: ctx.stationId },
            orderBy: { name: 'asc' },
        })

        // Auto-seed default groups if none exist for this station
        if (groups.length === 0) {
            await prisma.productGroup.createMany({
                data: [
                    { stationId: ctx.stationId, name: 'Lubes', color: 'blue' },
                    { stationId: ctx.stationId, name: 'Def', color: 'emerald' },
                    { stationId: ctx.stationId, name: 'Other', color: 'slate' },
                ],
                skipDuplicates: true,
            })

            groups = await prisma.productGroup.findMany({
                where: { stationId: ctx.stationId },
                orderBy: { name: 'asc' },
            })
        }

        // Calculate active product count per group
        const products = await prisma.product.findMany({
            where: { stationId: ctx.stationId, deletedAt: null },
            select: { group: true }
        })

        const countMap: Record<string, number> = {}
        for (const p of products) {
            const key = p.group.toLowerCase().trim()
            countMap[key] = (countMap[key] || 0) + 1
        }

        return groups.map(g => ({
            ...g,
            productCount: countMap[g.name.toLowerCase().trim()] || 0
        }))
    }),

    /**
     * Create a product group
     */
    createGroup: adminProcedure
        .input(
            z.object({
                name: z.string().trim().min(1, 'Group name is required'),
                color: z.string().optional().default('slate'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existing = await prisma.productGroup.findFirst({
                where: {
                    stationId: ctx.stationId,
                    name: { equals: input.name, mode: 'insensitive' }
                }
            })

            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Group "${input.name}" already exists`,
                })
            }

            return prisma.productGroup.create({
                data: {
                    stationId: ctx.stationId,
                    name: input.name,
                    color: input.color || 'slate',
                }
            })
        }),

    /**
     * Update a product group (renames cascade to existing products in station)
     */
    updateGroup: adminProcedure
        .input(
            z.object({
                id: z.number(),
                name: z.string().trim().min(1, 'Group name cannot be empty'),
                color: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const group = await prisma.productGroup.findFirst({
                where: { id: input.id, stationId: ctx.stationId }
            })

            if (!group) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Group not found',
                })
            }

            // Check for duplicate name if renaming
            if (input.name.toLowerCase() !== group.name.toLowerCase()) {
                const conflict = await prisma.productGroup.findFirst({
                    where: {
                        stationId: ctx.stationId,
                        name: { equals: input.name, mode: 'insensitive' },
                        id: { not: input.id }
                    }
                })

                if (conflict) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Group "${input.name}" already exists`,
                    })
                }

                // Cascade group name update to products
                await prisma.product.updateMany({
                    where: {
                        stationId: ctx.stationId,
                        group: { equals: group.name, mode: 'insensitive' }
                    },
                    data: { group: input.name }
                })
            }

            return prisma.productGroup.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    ...(input.color !== undefined ? { color: input.color } : {})
                }
            })
        }),

    /**
     * Delete a product group (only if not used by active products)
     */
    deleteGroup: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const group = await prisma.productGroup.findFirst({
                where: { id: input.id, stationId: ctx.stationId }
            })

            if (!group) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Group not found',
                })
            }

            // Check if any products use this group
            const productCount = await prisma.product.count({
                where: {
                    stationId: ctx.stationId,
                    group: { equals: group.name, mode: 'insensitive' },
                    deletedAt: null
                }
            })

            if (productCount > 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Cannot delete group "${group.name}" because ${productCount} product(s) are currently assigned to it. Please reassign or delete those products first.`,
                })
            }

            await prisma.productGroup.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),

    /**
     * ==================== PRODUCT UNITS ====================
     */

    /**
     * Get all product units for current station (auto-seeds defaults if none exist)
     */
    getUnits: tenantProcedure.query(async ({ ctx }) => {
        let units = await prisma.productUnit.findMany({
            where: { stationId: ctx.stationId },
            orderBy: { code: 'asc' },
        })

        // Auto-seed default units if none exist for this station
        if (units.length === 0) {
            await prisma.productUnit.createMany({
                data: [
                    { stationId: ctx.stationId, name: 'Pieces', code: 'Pcs' },
                    { stationId: ctx.stationId, name: 'Litres', code: 'L' },
                ],
                skipDuplicates: true,
            })

            units = await prisma.productUnit.findMany({
                where: { stationId: ctx.stationId },
                orderBy: { code: 'asc' },
            })
        }

        // Calculate active product count per unit
        const products = await prisma.product.findMany({
            where: { stationId: ctx.stationId, deletedAt: null },
            select: { unit: true }
        })

        const countMap: Record<string, number> = {}
        for (const p of products) {
            const key = p.unit.toLowerCase().trim()
            countMap[key] = (countMap[key] || 0) + 1
        }

        return units.map(u => ({
            ...u,
            productCount: countMap[u.code.toLowerCase().trim()] || 0
        }))
    }),

    /**
     * Create a product unit
     */
    createUnit: adminProcedure
        .input(
            z.object({
                name: z.string().trim().min(1, 'Unit name is required'),
                code: z.string().trim().min(1, 'Unit code is required'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existing = await prisma.productUnit.findFirst({
                where: {
                    stationId: ctx.stationId,
                    code: { equals: input.code, mode: 'insensitive' }
                }
            })

            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Unit with code "${input.code}" already exists`,
                })
            }

            return prisma.productUnit.create({
                data: {
                    stationId: ctx.stationId,
                    name: input.name,
                    code: input.code,
                }
            })
        }),

    /**
     * Update a product unit (renames cascade to existing products in station)
     */
    updateUnit: adminProcedure
        .input(
            z.object({
                id: z.number(),
                name: z.string().trim().min(1, 'Unit name cannot be empty'),
                code: z.string().trim().min(1, 'Unit code cannot be empty'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const unit = await prisma.productUnit.findFirst({
                where: { id: input.id, stationId: ctx.stationId }
            })

            if (!unit) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Unit not found',
                })
            }

            // Check for duplicate code if code changed
            if (input.code.toLowerCase() !== unit.code.toLowerCase()) {
                const conflict = await prisma.productUnit.findFirst({
                    where: {
                        stationId: ctx.stationId,
                        code: { equals: input.code, mode: 'insensitive' },
                        id: { not: input.id }
                    }
                })

                if (conflict) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Unit with code "${input.code}" already exists`,
                    })
                }

                // Cascade unit code update to products
                await prisma.product.updateMany({
                    where: {
                        stationId: ctx.stationId,
                        unit: { equals: unit.code, mode: 'insensitive' }
                    },
                    data: { unit: input.code }
                })
            }

            return prisma.productUnit.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    code: input.code,
                }
            })
        }),

    /**
     * Delete a product unit (only if not used by active products)
     */
    deleteUnit: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const unit = await prisma.productUnit.findFirst({
                where: { id: input.id, stationId: ctx.stationId }
            })

            if (!unit) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Unit not found',
                })
            }

            // Check if any products use this unit
            const productCount = await prisma.product.count({
                where: {
                    stationId: ctx.stationId,
                    unit: { equals: unit.code, mode: 'insensitive' },
                    deletedAt: null
                }
            })

            if (productCount > 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Cannot delete unit "${unit.code}" because ${productCount} product(s) are currently assigned to it. Please reassign or delete those products first.`,
                })
            }

            await prisma.productUnit.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),

    /**
     * ==================== STANDALONE PRODUCT SALES (ADMIN) ====================
     */

    /**
     * Create one or more standalone product sales outside of a shift (admin / manager)
     */
    createDirectSales: adminProcedure
        .input(
            z.object({
                soldAt: z.date().optional(),
                soldByUserId: z.number().nullable().optional(),
                notes: z.string().trim().max(500).optional(),
                items: z.array(
                    z.object({
                        productId: z.number(),
                        quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
                        price: z.number().min(0, 'Price must be 0 or higher').optional(),
                    })
                ).min(1, 'At least one product is required'),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const productIds = Array.from(new Set(input.items.map(i => i.productId)))
            const products = await prisma.product.findMany({
                where: {
                    id: { in: productIds },
                    stationId: ctx.stationId,
                    deletedAt: null,
                },
            })

            const productMap = new Map(products.map(p => [p.id, p]))
            for (const item of input.items) {
                if (!productMap.has(item.productId)) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'One or more selected products were not found',
                    })
                }
            }

            if (input.soldByUserId !== undefined && input.soldByUserId !== null) {
                const staff = await prisma.user.findFirst({
                    where: {
                        id: input.soldByUserId,
                        stationId: ctx.stationId,
                        deletedAt: null,
                    },
                })
                if (!staff) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Selected staff member not found',
                    })
                }
            }

            const saleTimestamp = input.soldAt ?? new Date()
            const notesValue = input.notes && input.notes.length > 0 ? input.notes : null
            const soldBy = input.soldByUserId === undefined ? ctx.user.id : input.soldByUserId

            const createdSales = await prisma.$transaction(
                input.items.map(item => {
                    const product = productMap.get(item.productId)!
                    const priceToUse = item.price !== undefined ? item.price : product.rate
                    const amount = Math.round(item.quantity * priceToUse * 100) / 100

                    return prisma.sessionProduct.create({
                        data: {
                            stationId: ctx.stationId,
                            dutySessionId: null,
                            productId: item.productId,
                            soldByUserId: soldBy,
                            createdByUserId: ctx.user.id,
                            quantity: new Prisma.Decimal(item.quantity),
                            price: new Prisma.Decimal(priceToUse),
                            amount: new Prisma.Decimal(amount),
                            soldAt: saleTimestamp,
                            notes: notesValue,
                        },
                        include: {
                            product: true,
                        },
                    })
                })
            )

            return createdSales
        }),

    /**
     * Update a standalone product sale (admin / manager)
     */
    updateDirectSale: adminProcedure
        .input(
            z.object({
                id: z.number(),
                productId: z.number().optional(),
                quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
                price: z.number().min(0, 'Price must be 0 or higher').optional(),
                soldAt: z.date().optional(),
                soldByUserId: z.number().nullable().optional(),
                notes: z.string().trim().max(500).nullable().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const existing = await prisma.sessionProduct.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId,
                },
                include: { product: true },
            })

            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Product sale record not found',
                })
            }

            if (existing.dutySessionId !== null) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Shift-linked product sales must be edited from the shift',
                })
            }

            const productIdToUse = input.productId ?? existing.productId
            const product = await prisma.product.findFirst({
                where: {
                    id: productIdToUse,
                    stationId: ctx.stationId,
                    deletedAt: null,
                },
            })

            if (!product) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Product not found',
                })
            }

            if (input.soldByUserId !== undefined && input.soldByUserId !== null) {
                const staff = await prisma.user.findFirst({
                    where: {
                        id: input.soldByUserId,
                        stationId: ctx.stationId,
                        deletedAt: null,
                    },
                })
                if (!staff) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Selected staff member not found',
                    })
                }
            }

            const priceToUse =
                input.price !== undefined
                    ? input.price
                    : input.productId && input.productId !== existing.productId
                        ? product.rate
                        : Number(existing.price)
            const amount = Math.round(input.quantity * priceToUse * 100) / 100

            return prisma.sessionProduct.update({
                where: { id: input.id },
                data: {
                    productId: productIdToUse,
                    quantity: new Prisma.Decimal(input.quantity),
                    price: new Prisma.Decimal(priceToUse),
                    amount: new Prisma.Decimal(amount),
                    ...(input.soldAt !== undefined ? { soldAt: input.soldAt } : {}),
                    ...(input.soldByUserId !== undefined ? { soldByUserId: input.soldByUserId } : {}),
                    ...(input.notes !== undefined
                        ? { notes: input.notes && input.notes.length > 0 ? input.notes : null }
                        : {}),
                },
                include: {
                    product: true,
                    soldByUser: { select: { id: true, name: true, username: true } },
                    createdByUser: { select: { id: true, name: true, username: true } },
                },
            })
        }),

    /**
     * Delete a standalone product sale (admin / manager)
     */
    deleteDirectSale: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const existing = await prisma.sessionProduct.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId,
                },
            })

            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Product sale record not found',
                })
            }

            if (existing.dutySessionId !== null) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Shift-linked product sales must be deleted from the shift',
                })
            }

            await prisma.sessionProduct.delete({
                where: { id: input.id },
            })

            return { success: true }
        }),

    /**
     * Get Product Sales Report (tenant-scoped)
     */
    getSalesReport: tenantProcedure
        .input(
            z.object({
                startDate: z.date().optional(),
                endDate: z.date().optional(),
                group: z.string().optional(),
                productId: z.number().optional(),
                userId: z.number().optional(),
                limit: z.number().min(1).max(10000).default(50),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ ctx, input }) => {
            const productFilter: Prisma.ProductWhereInput = {
                stationId: ctx.stationId,
            }

            // Group filter
            if (input.group && input.group !== 'all') {
                productFilter.group = input.group
            }

            const where: Prisma.SessionProductWhereInput = {
                stationId: ctx.stationId,
                product: productFilter,
            }

            // Date filtering on SessionProduct.soldAt
            if (input.startDate || input.endDate) {
                where.soldAt = {}
                if (input.startDate) {
                    where.soldAt.gte = new Date(input.startDate)
                }
                if (input.endDate) {
                    const end = new Date(input.endDate)
                    end.setDate(end.getDate() + 1)
                    where.soldAt.lt = end
                }
            }

            // Product filter
            if (input.productId) {
                where.productId = input.productId
            }

            // Attendant / User filter & security check for non-admins
            const isAdminOrManager = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const targetUserId = !isAdminOrManager ? ctx.user.id : input.userId
            if (targetUserId) {
                where.OR = [
                    { dutySession: { userId: targetUserId } },
                    { dutySessionId: null, soldByUserId: targetUserId },
                ]
            }

            const [transactions, totalCount, allMatching] = await Promise.all([
                prisma.sessionProduct.findMany({
                    where,
                    include: {
                        product: true,
                        soldByUser: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                            },
                        },
                        createdByUser: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                            },
                        },
                        dutySession: {
                            select: {
                                id: true,
                                type: true,
                                status: true,
                                startTime: true,
                                endTime: true,
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: [
                        { soldAt: 'desc' },
                        { id: 'desc' },
                    ],
                    take: input.limit,
                    skip: input.offset,
                }),
                prisma.sessionProduct.count({ where }),
                prisma.sessionProduct.findMany({
                    where,
                    select: {
                        productId: true,
                        quantity: true,
                        price: true,
                        amount: true,
                        product: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                                unit: true,
                                group: true,
                            },
                        },
                    },
                }),
            ])

            // Calculate overall aggregates
            let totalSalesAmount = 0
            let totalQuantity = 0

            // Aggregation by product
            const productMap = new Map<number, {
                productId: number
                code: string
                name: string
                unit: string
                group: string
                quantity: number
                amount: number
                salesCount: number
            }>()

            // Aggregation by group
            const groupMap = new Map<string, {
                group: string
                quantity: number
                amount: number
                salesCount: number
            }>()

            for (const item of allMatching) {
                const qty = Number(item.quantity || 0)
                const amt = Number(item.amount || (qty * Number(item.price || 0)))
                totalSalesAmount += amt
                totalQuantity += qty

                const p = item.product
                if (p) {
                    const existingP = productMap.get(p.id)
                    if (existingP) {
                        existingP.quantity += qty
                        existingP.amount += amt
                        existingP.salesCount += 1
                    } else {
                        productMap.set(p.id, {
                            productId: p.id,
                            code: p.code,
                            name: p.name,
                            unit: p.unit,
                            group: p.group,
                            quantity: qty,
                            amount: amt,
                            salesCount: 1,
                        })
                    }

                    const groupKey = p.group || 'Other'
                    const existingG = groupMap.get(groupKey)
                    if (existingG) {
                        existingG.quantity += qty
                        existingG.amount += amt
                        existingG.salesCount += 1
                    } else {
                        groupMap.set(groupKey, {
                            group: groupKey,
                            quantity: qty,
                            amount: amt,
                            salesCount: 1,
                        })
                    }
                }
            }

            const byProduct = Array.from(productMap.values()).map(p => ({
                ...p,
                averagePrice: p.quantity > 0 ? p.amount / p.quantity : 0,
                percentage: totalSalesAmount > 0 ? (p.amount / totalSalesAmount) * 100 : 0,
            })).sort((a, b) => b.amount - a.amount)

            const byGroup = Array.from(groupMap.values()).map(g => ({
                ...g,
                percentage: totalSalesAmount > 0 ? (g.amount / totalSalesAmount) * 100 : 0,
            })).sort((a, b) => b.amount - a.amount)

            const topProduct = byProduct.length > 0 ? byProduct[0] : null

            return {
                summary: {
                    totalSalesAmount: Math.round(totalSalesAmount * 100) / 100,
                    totalQuantity: Math.round(totalQuantity * 100) / 100,
                    transactionCount: totalCount,
                    uniqueProductsCount: productMap.size,
                    topProduct,
                },
                byProduct,
                byGroup,
                transactions: transactions.map(t => ({
                    id: t.id,
                    dutySessionId: t.dutySessionId,
                    soldAt: t.soldAt,
                    createdAt: t.createdAt,
                    notes: t.notes,
                    soldByUserId: t.soldByUserId,
                    soldByUser: t.soldByUser,
                    createdByUser: t.createdByUser,
                    quantity: Number(t.quantity),
                    price: Number(t.price),
                    amount: Number(t.amount),
                    product: t.product,
                    dutySession: t.dutySession,
                })),
                pagination: {
                    total: totalCount,
                    limit: input.limit,
                    offset: input.offset,
                },
            }
        }),
})
