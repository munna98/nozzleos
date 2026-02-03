import { z } from 'zod'
import { router, tenantProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'

export const paymentRouter = router({
    /**
     * Get payment transactions with filters (tenant-scoped)
     */
    getTransactions: tenantProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            paymentMethodId: z.number().optional().nullable(),
            isCustomerPayment: z.boolean().optional(),
            userId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const where: Record<string, unknown> = {
                // Filter by station via the duty session
                dutySession: {
                    stationId: ctx.stationId
                }
            }

            // Date range filter
            if (input.startDate || input.endDate) {
                where.createdAt = {}
                if (input.startDate) {
                    const start = new Date(input.startDate);
                    (where.createdAt as Record<string, unknown>).gte = start
                }
                if (input.endDate) {
                    const end = new Date(input.endDate)
                    end.setDate(end.getDate() + 1);
                    (where.createdAt as Record<string, unknown>).lt = end
                }
            }

            // Payment method filter
            if (input.paymentMethodId) {
                where.paymentMethodId = input.paymentMethodId
            }

            // Customer payment filter
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
                (where.dutySession as Record<string, unknown>).userId = input.userId
            }

            // Security: Limit non-admins to their own sessions
            if (ctx.user.role !== 'Admin' && ctx.user.role !== 'Manager') {
                (where.dutySession as Record<string, unknown>).userId = ctx.user.id
            }

            const [transactions, total] = await Promise.all([
                prisma.sessionPayment.findMany({
                    where,
                    include: {
                        paymentMethod: true,
                        dutySession: {
                            include: {
                                user: { select: { id: true, name: true, username: true } },
                                nozzleReadings: {
                                    include: {
                                        nozzle: { select: { code: true } }
                                    }
                                }
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

            // Calculate total amount for the filtered range
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
