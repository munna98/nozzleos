import { z } from 'zod'
import { router, protectedProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'

export const paymentRouter = router({
    /**
     * Get payment transactions with filters
     */
    getTransactions: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            paymentMethodId: z.number().optional().nullable(),
            isCustomerPayment: z.boolean().optional(),
            userId: z.number().optional(), // Filter by attendant (for admins)
        }))
        .query(async ({ input, ctx }) => {
            const where: any = {}

            // Date range filter
            if (input.startDate || input.endDate) {
                where.createdAt = {}
                if (input.startDate) {
                    const start = new Date(input.startDate)
                    start.setHours(0, 0, 0, 0)
                    where.createdAt.gte = start
                }
                if (input.endDate) {
                    const end = new Date(input.endDate)
                    end.setHours(0, 0, 0, 0)
                    end.setDate(end.getDate() + 1)
                    where.createdAt.lt = end
                }
            }

            // Payment method filter
            if (input.paymentMethodId) {
                where.paymentMethodId = input.paymentMethodId
            }

            // Customer payment filter (all methods with a customer)
            if (input.isCustomerPayment === true) {
                where.paymentMethod = {
                    customerId: { not: null }
                }
            } else if (input.isCustomerPayment === false) {
                where.paymentMethod = {
                    customerId: null
                }
            }

            // User/Attendant filter
            if (input.userId) {
                where.dutySession = {
                    userId: input.userId
                }
            }

            // Security: Limit non-admins to their own sessions?
            // Usually reports are for admins/managers. 
            // If simple user accesses, maybe restrict to their own?
            // For now, let's allow "Manager" and "Admin" to see all, others only theirs.
            if (ctx.user.role !== 'Admin' && ctx.user.role !== 'Manager') {
                where.dutySession = {
                    ...where.dutySession,
                    userId: ctx.user.id
                }
            }

            const [transactions, total] = await Promise.all([
                prisma.sessionPayment.findMany({
                    where,
                    include: {
                        paymentMethod: true,
                        dutySession: {
                            include: {
                                user: { select: { id: true, name: true, username: true } }
                            }
                        },
                        denominations: {
                            include: { denomination: true }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: input.limit,
                    skip: input.offset,
                }),
                prisma.sessionPayment.count({ where })
            ])

            // Calculate total amount for the filtered range (not just pagination)
            // This aggregate might be heavy if many rows, but useful for "Total" card
            const aggregations = await prisma.sessionPayment.aggregate({
                where,
                _sum: {
                    amount: true
                },
                _count: true
            })

            return {
                transactions,
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                },
                summary: {
                    totalAmount: Number(aggregations._sum.amount || 0),
                    totalCount: aggregations._count
                }
            }
        })
})
