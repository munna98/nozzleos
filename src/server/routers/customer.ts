import { z } from 'zod'
import { router, adminProcedure, protectedProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

export const customerRouter = router({
    /**
     * Get all customers
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.customer.findMany({
            where: { deletedAt: null },
            include: { paymentMethod: true },
            orderBy: { name: 'asc' },
        })
    }),

    /**
     * Get customer by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.customer.findUnique({
                where: { id: input.id },
                include: { paymentMethod: true },
            })
        }),

    /**
     * Create customer (admin only)
     */
    create: adminProcedure
        .input(z.object({
            name: z.string().min(1),
            email: z.string().email().optional(),
            phone: z.string().optional(),
            createPaymentMethod: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { createPaymentMethod, ...data } = input
            const customer = await prisma.customer.create({ data })

            if (createPaymentMethod) {
                // Check if payment method with same name exists
                const existing = await prisma.paymentMethod.findUnique({ where: { name: customer.name } })
                if (!existing) {
                    await prisma.paymentMethod.create({
                        data: {
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
            email: z.string().email().optional(),
            phone: z.string().optional(),
            isActive: z.boolean().optional(),
            createPaymentMethod: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, createPaymentMethod, ...data } = input
            const customer = await prisma.customer.update({ where: { id }, data })

            if (createPaymentMethod) {
                const existing = await prisma.paymentMethod.findUnique({ where: { customerId: id } })
                if (!existing) {
                    // Use name, ensure unique
                    const name = customer.name
                    const nameExists = await prisma.paymentMethod.findUnique({ where: { name } })

                    if (!nameExists) {
                        await prisma.paymentMethod.create({
                            data: {
                                name: customer.name,
                                customerId: customer.id,
                            }
                        })
                    }
                }
            } else if (createPaymentMethod === false) {
                // Check if we should delete it? 
                // The checkbox says "Use as Payment Method". Unchecking it usually means "remove linkage" or "deactivate"?
                // For now, let's assuming enabling only.
                // If specific logic needed for disable, we can add.
            }

            return customer
        }),

    /**
     * Delete customer (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            // Check if customer has a payment method with session payments
            const customer = await prisma.customer.findUnique({
                where: { id: input.id },
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

            if (customer?.paymentMethod && customer.paymentMethod._count.sessionPayments > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete customer because they have recorded payments in shifts. Try deactivating them instead.'
                })
            }

            // Perform hard delete within a transaction
            return await prisma.$transaction(async (tx) => {
                // Delete linked payment method first if it exists
                if (customer?.paymentMethod) {
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
