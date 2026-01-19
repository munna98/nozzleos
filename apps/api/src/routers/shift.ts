import { router, protectedProcedure } from '@nozzleos/trpc'
import { prisma } from '@nozzleos/db'
import {
    startShiftSchema,
    addPaymentSchema,
    updateNozzleReadingSchema,
    completeShiftSchema,
} from '@nozzleos/validators'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { Decimal } from 'decimal.js'

// Helper function to generate shift name
function generateShiftName(): string {
    const now = new Date()
    const hours = now.getHours()

    let shiftType: string
    if (hours >= 6 && hours < 14) {
        shiftType = 'Morning'
    } else if (hours >= 14 && hours < 22) {
        shiftType = 'Evening'
    } else {
        shiftType = 'Night'
    }

    const dateStr = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })

    return `${shiftType} Shift - ${dateStr}`
}

export const shiftRouter = router({
    /**
     * Generate a shift name
     */
    generateShiftName: protectedProcedure.query(() => {
        return { shiftName: generateShiftName() }
    }),

    /**
     * Get all shifts with pagination
     */
    getAll: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(10),
            offset: z.number().min(0).default(0),
            status: z.enum(['in_progress', 'completed', 'archived']).optional(),
        }))
        .query(async ({ input, ctx }) => {
            const where: Record<string, unknown> = {}

            if (input.status) {
                where.status = input.status
            }

            // Non-admin users can only see their own shifts
            if (ctx.user.role !== 'Admin') {
                where.userId = ctx.user.id
            }

            const [sessions, total] = await Promise.all([
                prisma.dutySession.findMany({
                    where,
                    include: {
                        user: { include: { role: true } },
                        nozzleReadings: {
                            include: {
                                nozzle: { include: { fuel: true, dispenser: true } },
                            },
                        },
                        sessionPayments: {
                            include: { paymentMethod: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: input.limit,
                    skip: input.offset,
                }),
                prisma.dutySession.count({ where }),
            ])

            return { sessions, pagination: { total, limit: input.limit, offset: input.offset } }
        }),

    /**
     * Get active shift for current user
     */
    getActive: protectedProcedure.query(async ({ ctx }) => {
        return prisma.dutySession.findFirst({
            where: {
                userId: ctx.user.id,
                status: 'in_progress',
            },
            include: {
                nozzleReadings: {
                    include: {
                        nozzle: { include: { fuel: true, dispenser: true } },
                    },
                },
                sessionPayments: {
                    include: { paymentMethod: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        })
    }),

    /**
     * Start a new shift
     */
    start: protectedProcedure
        .input(startShiftSchema)
        .mutation(async ({ input, ctx }) => {
            // Check for existing active shift
            const existingShift = await prisma.dutySession.findFirst({
                where: { userId: ctx.user.id, status: 'in_progress' },
            })

            if (existingShift) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'You already have an active shift',
                })
            }

            // Check nozzle availability
            const nozzles = await prisma.nozzle.findMany({
                where: {
                    id: { in: input.nozzleIds },
                    isActive: true,
                    deletedAt: null,
                },
            })

            if (nozzles.length !== input.nozzleIds.length) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'One or more selected nozzles not found',
                })
            }

            const inUseNozzles = nozzles.filter((n) => !n.isAvailable)
            if (inUseNozzles.length > 0) {
                const inUseCodes = inUseNozzles.map((n) => n.code).join(', ')
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `The following nozzles are already in use: ${inUseCodes}`,
                })
            }

            // Create shift and update nozzle availability
            return prisma.$transaction(async (tx) => {
                // Mark nozzles as unavailable
                await tx.nozzle.updateMany({
                    where: { id: { in: input.nozzleIds } },
                    data: { isAvailable: false },
                })

                // Create duty session
                const session = await tx.dutySession.create({
                    data: {
                        userId: ctx.user.id,
                        shiftName: input.shiftName,
                        nozzleReadings: {
                            create: nozzles.map((nozzle) => ({
                                nozzleId: nozzle.id,
                                openingReading: nozzle.currentreading,
                            })),
                        },
                    },
                    include: {
                        nozzleReadings: {
                            include: {
                                nozzle: { include: { fuel: true, dispenser: true } },
                            },
                        },
                        sessionPayments: true,
                    },
                })

                return session
            })
        }),

    /**
     * Add a payment to the shift
     */
    addPayment: protectedProcedure
        .input(z.object({ shiftId: z.number(), data: addPaymentSchema }))
        .mutation(async ({ input, ctx }) => {
            const session = await prisma.dutySession.findFirst({
                where: { id: input.shiftId, userId: ctx.user.id, status: 'in_progress' },
            })

            if (!session) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Active shift not found',
                })
            }

            const payment = await prisma.sessionPayment.create({
                data: {
                    dutySessionId: input.shiftId,
                    paymentMethodId: input.data.paymentMethodId,
                    amount: input.data.amount,
                    quantity: input.data.quantity,
                },
                include: { paymentMethod: true },
            })

            // Update total payment collected
            const totalPayments = await prisma.sessionPayment.aggregate({
                where: { dutySessionId: input.shiftId },
                _sum: { amount: true },
            })

            await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: { totalPaymentCollected: totalPayments._sum.amount || 0 },
            })

            return payment
        }),

    /**
     * Delete a payment from the shift
     */
    deletePayment: protectedProcedure
        .input(z.object({ shiftId: z.number(), paymentId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const session = await prisma.dutySession.findFirst({
                where: { id: input.shiftId, userId: ctx.user.id, status: 'in_progress' },
            })

            if (!session) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Active shift not found',
                })
            }

            await prisma.sessionPayment.delete({
                where: { id: input.paymentId },
            })

            // Update total
            const totalPayments = await prisma.sessionPayment.aggregate({
                where: { dutySessionId: input.shiftId },
                _sum: { amount: true },
            })

            await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: { totalPaymentCollected: totalPayments._sum.amount || 0 },
            })

            return { success: true }
        }),

    /**
     * Update nozzle reading
     */
    updateNozzleReading: protectedProcedure
        .input(z.object({ shiftId: z.number(), data: updateNozzleReadingSchema }))
        .mutation(async ({ input, ctx }) => {
            const session = await prisma.dutySession.findFirst({
                where: { id: input.shiftId, userId: ctx.user.id, status: 'in_progress' },
            })

            if (!session) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Active shift not found',
                })
            }

            const reading = await prisma.nozzleSessionReading.findUnique({
                where: { id: input.data.nozzleReadingId },
            })

            if (!reading) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Nozzle reading not found',
                })
            }

            const updateData: Record<string, unknown> = {}
            if (input.data.testQty !== undefined) {
                updateData.testQty = input.data.testQty
            }
            if (input.data.closingReading !== undefined) {
                updateData.closingReading = input.data.closingReading
                const opening = new Decimal(reading.openingReading.toString())
                const closing = new Decimal(input.data.closingReading)
                const testQty = new Decimal(input.data.testQty ?? reading.testQty.toString())
                updateData.fuelDispensed = closing.minus(opening).minus(testQty).toNumber()
            }

            return prisma.nozzleSessionReading.update({
                where: { id: input.data.nozzleReadingId },
                data: updateData,
                include: { nozzle: { include: { fuel: true, dispenser: true } } },
            })
        }),

    /**
     * Update a payment in the shift
     */
    updatePayment: protectedProcedure
        .input(z.object({ shiftId: z.number(), paymentId: z.number(), data: addPaymentSchema }))
        .mutation(async ({ input, ctx }) => {
            const session = await prisma.dutySession.findFirst({
                where: { id: input.shiftId, userId: ctx.user.id, status: 'in_progress' },
            })

            if (!session) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Active shift not found',
                })
            }

            const existingPayment = await prisma.sessionPayment.findFirst({
                where: { id: input.paymentId, dutySessionId: input.shiftId }
            })

            if (!existingPayment) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Payment not found',
                })
            }

            const payment = await prisma.sessionPayment.update({
                where: { id: input.paymentId },
                data: {
                    paymentMethodId: input.data.paymentMethodId,
                    amount: input.data.amount,
                    quantity: input.data.quantity,
                },
                include: { paymentMethod: true },
            })

            // Update total payment collected
            const totalPayments = await prisma.sessionPayment.aggregate({
                where: { dutySessionId: input.shiftId },
                _sum: { amount: true },
            })

            await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: { totalPaymentCollected: totalPayments._sum.amount || 0 },
            })

            return payment
        }),

    /**
     * Get shift summary/preview
     */
    getSummary: protectedProcedure
        .input(z.object({ shiftId: z.number() }))
        .query(async ({ input, ctx }) => {
            const session = await prisma.dutySession.findFirst({
                where: { id: input.shiftId },
                include: {
                    nozzleReadings: {
                        include: {
                            nozzle: { include: { fuel: true } }
                        }
                    },
                    sessionPayments: { include: { paymentMethod: true } }
                }
            })

            if (!session) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Shift not found',
                })
            }

            // Non-admin can only see their own shifts
            if (ctx.user.role !== 'Admin' && session.userId !== ctx.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to view this shift',
                })
            }

            let totalFuelSales = 0

            const readingsWithAmount = session.nozzleReadings.map(reading => {
                const consumed = Number(reading.fuelDispensed)
                const price = Number(reading.nozzle.price)
                const amount = consumed * price
                totalFuelSales += amount

                return {
                    ...reading,
                    amount,
                    price
                }
            })

            const totalCollected = Number(session.totalPaymentCollected)
            const shortage = totalCollected - totalFuelSales

            return {
                ...session,
                totalFuelSales,
                totalCollected,
                shortage,
                nozzleReadings: readingsWithAmount
            }
        }),

    /**
     * Complete the shift
     */
    complete: protectedProcedure
        .input(z.object({ shiftId: z.number(), data: completeShiftSchema }))
        .mutation(async ({ input, ctx }) => {
            const session = await prisma.dutySession.findFirst({
                where: { id: input.shiftId, userId: ctx.user.id, status: 'in_progress' },
                include: { nozzleReadings: true },
            })

            if (!session) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Active shift not found',
                })
            }

            return prisma.$transaction(async (tx) => {
                // Mark nozzles as available again
                const nozzleIds = session.nozzleReadings.map((r) => r.nozzleId)
                await tx.nozzle.updateMany({
                    where: { id: { in: nozzleIds } },
                    data: { isAvailable: true },
                })

                // Update nozzle current readings
                for (const reading of session.nozzleReadings) {
                    if (reading.closingReading) {
                        await tx.nozzle.update({
                            where: { id: reading.nozzleId },
                            data: { currentreading: reading.closingReading.toNumber() },
                        })
                    }
                }

                // Complete the session
                return tx.dutySession.update({
                    where: { id: input.shiftId },
                    data: {
                        status: 'completed',
                        endTime: new Date(),
                        notes: input.data.notes,
                    },
                    include: {
                        nozzleReadings: {
                            include: { nozzle: { include: { fuel: true, dispenser: true } } },
                        },
                        sessionPayments: { include: { paymentMethod: true } },
                    },
                })
            })
        }),
})
