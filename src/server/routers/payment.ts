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

            // Calculate aggregations for the filtered range
            const aggregations = await prisma.sessionPayment.aggregate({
                where,
                _sum: {
                    amount: true
                },
                _count: true
            })

            const totalAmount = Number(aggregations._sum.amount || 0)
            const totalCount = aggregations._count

            // Payment method breakdown via groupBy
            const methodGroup = await prisma.sessionPayment.groupBy({
                by: ['paymentMethodId'],
                where,
                _sum: {
                    amount: true,
                },
                _count: {
                    id: true,
                },
            })

            const methodIds = methodGroup.map(g => g.paymentMethodId)
            const paymentMethods = methodIds.length > 0
                ? await prisma.paymentMethod.findMany({
                    where: { id: { in: methodIds } },
                    select: { id: true, name: true, customerId: true }
                })
                : []
            const methodMap = new Map(paymentMethods.map(m => [m.id, m]))

            let standardTotal = 0
            let standardCount = 0
            let customerTotal = 0
            let customerCount = 0

            const byMethod = methodGroup.map(g => {
                const method = methodMap.get(g.paymentMethodId)
                const amount = Number(g._sum.amount || 0)
                const count = g._count.id
                const isCustomer = !!method?.customerId
                if (isCustomer) {
                    customerTotal += amount
                    customerCount += count
                } else {
                    standardTotal += amount
                    standardCount += count
                }
                return {
                    paymentMethodId: g.paymentMethodId,
                    name: method?.name || 'Unknown Method',
                    isCustomer,
                    amount,
                    count,
                    percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
                }
            }).sort((a, b) => b.amount - a.amount)

            // Attendant breakdown via findMany
            const attendantPayments = await prisma.sessionPayment.findMany({
                where,
                select: {
                    amount: true,
                    dutySession: {
                        select: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                }
                            }
                        }
                    }
                }
            })

            const attendantMap = new Map<number, { id: number; name: string; username: string; amount: number; count: number }>()
            for (const p of attendantPayments) {
                const u = p.dutySession.user
                const amt = Number(p.amount)
                const existing = attendantMap.get(u.id)
                if (existing) {
                    existing.amount += amt
                    existing.count += 1
                } else {
                    attendantMap.set(u.id, {
                        id: u.id,
                        name: u.name || u.username,
                        username: u.username,
                        amount: amt,
                        count: 1
                    })
                }
            }

            const byAttendant = Array.from(attendantMap.values()).map(att => ({
                ...att,
                percentage: totalAmount > 0 ? (att.amount / totalAmount) * 100 : 0
            })).sort((a, b) => b.amount - a.amount)

            return {
                transactions,
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                },
                summary: {
                    totalAmount,
                    totalCount,
                    standardTotal,
                    standardCount,
                    customerTotal,
                    customerCount,
                    byMethod,
                    byAttendant,
                }
            }
        })
})

