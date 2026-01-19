import { router, protectedProcedure } from '@nozzleos/trpc'
import { prisma } from '@nozzleos/db'
import {
    createCustomerSchema,
    updateCustomerSchema,
} from '@nozzleos/validators'
import { z } from 'zod'

export const customerRouter = router({
    /**
     * Get all active customers
     */
    getAll: protectedProcedure.query(async () => {
        return prisma.customer.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { paymentMethod: true },
        })
    }),

    /**
     * Get a single customer by ID
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
     * Create a new customer with optional payment method
     */
    create: protectedProcedure
        .input(createCustomerSchema)
        .mutation(async ({ input }) => {
            return prisma.$transaction(async (tx) => {
                const customer = await tx.customer.create({
                    data: {
                        name: input.name,
                        email: input.email || null,
                        phone: input.phone,
                        isActive: true,
                    },
                })

                if (input.createPaymentMethod !== false) {
                    await tx.paymentMethod.create({
                        data: {
                            name: customer.name,
                            isActive: true,
                            customerId: customer.id,
                        },
                    })
                }

                return tx.customer.findUnique({
                    where: { id: customer.id },
                    include: { paymentMethod: true },
                })
            })
        }),

    /**
     * Update an existing customer
     */
    update: protectedProcedure
        .input(z.object({ id: z.number(), data: updateCustomerSchema }))
        .mutation(async ({ input }) => {
            return prisma.$transaction(async (tx) => {
                const customer = await tx.customer.update({
                    where: { id: input.id },
                    data: {
                        name: input.data.name,
                        email: input.data.email || null,
                        phone: input.data.phone,
                        isActive: input.data.isActive,
                    },
                    include: { paymentMethod: true },
                })

                const existingPaymentMethod = await tx.paymentMethod.findUnique({
                    where: { customerId: customer.id },
                })

                if (input.data.createPaymentMethod === true && !existingPaymentMethod) {
                    await tx.paymentMethod.create({
                        data: {
                            name: customer.name,
                            isActive: true,
                            customerId: customer.id,
                        },
                    })
                } else if (input.data.createPaymentMethod === false && existingPaymentMethod) {
                    await tx.paymentMethod.delete({
                        where: { id: existingPaymentMethod.id },
                    })
                } else if (existingPaymentMethod && input.data.name && existingPaymentMethod.name !== input.data.name) {
                    await tx.paymentMethod.update({
                        where: { id: existingPaymentMethod.id },
                        data: { name: input.data.name },
                    })
                }

                return tx.customer.findUnique({
                    where: { id: customer.id },
                    include: { paymentMethod: true },
                })
            })
        }),

    /**
     * Soft delete a customer
     */
    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return prisma.customer.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), isActive: false },
            })
        }),
})
