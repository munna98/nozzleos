import { z } from 'zod'
import { router, adminProcedure, tenantProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

export const customerRouter = router({
    /**
     * Get all customers for the current station
     */
    getAll: tenantProcedure.query(async ({ ctx }) => {
        return prisma.customer.findMany({
            where: {
                stationId: ctx.stationId,
                deletedAt: null
            },
            include: { paymentMethod: true },
            orderBy: { name: 'asc' },
        })
    }),

    /**
     * Get customer by ID (tenant-scoped)
     */
    getById: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            return prisma.customer.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
                include: { paymentMethod: true },
            })
        }),

    /**
     * Create customer (admin only)
     */
    create: adminProcedure
        .input(z.object({
            name: z.string().min(1),
            email: z.string().email().optional().nullable(),
            phone: z.string().optional(),
            createPaymentMethod: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { createPaymentMethod, ...data } = input
            const customer = await prisma.customer.create({
                data: {
                    ...data,
                    stationId: ctx.stationId,
                }
            })

            if (createPaymentMethod) {
                // Check if payment method with same name exists for this station
                const existing = await prisma.paymentMethod.findFirst({
                    where: {
                        stationId: ctx.stationId,
                        name: customer.name
                    }
                })
                if (!existing) {
                    await prisma.paymentMethod.create({
                        data: {
                            stationId: ctx.stationId,
                            name: customer.name,
                            customerId: customer.id,
                        }
                    })
                }
            }
            return customer
        }),

    /**
     * Update customer (admin only)
     */
    update: adminProcedure
        .input(z.object({
            id: z.number(),
            name: z.string().min(1).optional(),
            email: z.string().email().optional().nullable(),
            phone: z.string().optional(),
            isActive: z.boolean().optional(),
            createPaymentMethod: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, createPaymentMethod, ...data } = input

            // Verify customer belongs to this station
            const existingCustomer = await prisma.customer.findFirst({
                where: { id, stationId: ctx.stationId }
            })
            if (!existingCustomer) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Customer not found'
                })
            }

            const customer = await prisma.customer.update({ where: { id }, data })

            if (createPaymentMethod) {
                const existing = await prisma.paymentMethod.findUnique({ where: { customerId: id } })
                if (!existing) {
                    // Check if name exists for this station
                    const nameExists = await prisma.paymentMethod.findFirst({
                        where: {
                            stationId: ctx.stationId,
                            name: customer.name
                        }
                    })

                    if (!nameExists) {
                        await prisma.paymentMethod.create({
                            data: {
                                stationId: ctx.stationId,
                                name: customer.name,
                                customerId: customer.id,
                            }
                        })
                    }
                }
            }

            return customer
        }),

    /**
     * Delete customer (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Verify customer belongs to this station
            const customer = await prisma.customer.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
                include: {
                    paymentMethod: {
                        include: {
                            _count: {
                                select: { sessionPayments: true }
                            }
                        }
                    }
                }
            })

            if (!customer) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Customer not found'
                })
            }

            if (customer.paymentMethod && customer.paymentMethod._count.sessionPayments > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete customer because they have recorded payments in shifts. Try deactivating them instead.'
                })
            }

            // Perform hard delete within a transaction
            return await prisma.$transaction(async (tx) => {
                // Delete linked payment method first if it exists
                if (customer.paymentMethod) {
                    await tx.paymentMethod.delete({
                        where: { id: customer.paymentMethod.id }
                    })
                }

                // Delete the customer
                await tx.customer.delete({
                    where: { id: input.id }
                })

                return { success: true }
            })
        }),
})
