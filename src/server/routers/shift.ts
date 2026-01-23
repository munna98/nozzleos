import { z } from 'zod'
import { Prisma, ShiftType } from '@prisma/client'
import { router, protectedProcedure, adminProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'

export const shiftRouter = router({
    /**
     * Get active shift for current user
     */
    getActive: protectedProcedure.query(async ({ ctx }) => {
        const shift = await prisma.dutySession.findFirst({
            where: {
                userId: ctx.user.id,
                status: 'in_progress',
            },
            include: {
                nozzleReadings: {
                    include: {
                        nozzle: {
                            include: { fuel: true, dispenser: true },
                        },
                    },
                },
                sessionPayments: {
                    include: {
                        paymentMethod: true,
                        denominations: {
                            include: { denomination: true },
                        },
                    },
                },
            },
        })
        return shift
    }),

    /**
     * Start a new shift
     */
    /**
     * Start a new shift
     */
    start: protectedProcedure
        .input(z.object({
            shiftType: z.nativeEnum(ShiftType),
            nozzleIds: z.array(z.number()).min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check for existing active shift
            const existingShift = await prisma.dutySession.findFirst({
                where: { userId: ctx.user.id, status: 'in_progress' },
            })
            if (existingShift) {
                throw new Error('You already have an active shift')
            }

            // Get nozzles with current readings
            const nozzles = await prisma.nozzle.findMany({
                where: { id: { in: input.nozzleIds } },
            })

            // Create shift with nozzle readings
            const shift = await prisma.dutySession.create({
                data: {
                    userId: ctx.user.id,
                    type: input.shiftType,
                    nozzleReadings: {
                        create: nozzles.map((nozzle: { id: number; currentreading: number }) => ({
                            nozzleId: nozzle.id,
                            openingReading: new Prisma.Decimal(nozzle.currentreading),
                        })),
                    },
                },
                include: {
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true, dispenser: true } } },
                    },
                },
            })

            // Mark nozzles as unavailable
            await prisma.nozzle.updateMany({
                where: { id: { in: input.nozzleIds } },
                data: { isAvailable: false },
            })

            return shift
        }),

    /**
     * Update test quantities
     */
    updateTestQty: protectedProcedure
        .input(z.object({
            readings: z.array(z.object({
                readingId: z.number(),
                testQty: z.number().min(0),
            })),
        }))
        .mutation(async ({ input }) => {
            for (const reading of input.readings) {
                await prisma.nozzleSessionReading.update({
                    where: { id: reading.readingId },
                    data: { testQty: new Prisma.Decimal(reading.testQty) },
                })
            }
            return { success: true }
        }),

    /**
     * Add payment to shift
     */
    addPayment: protectedProcedure
        .input(z.object({
            shiftId: z.number(),
            paymentMethodId: z.number(),
            amount: z.number().min(0),
            quantity: z.number().optional(),
            // Denomination support for cash payments
            denominations: z.array(z.object({
                denominationId: z.number(),
                count: z.number().min(0),
            })).optional(),
            coinsAmount: z.number().min(0).optional(),
        }))
        .mutation(async ({ input }) => {
            const payment = await prisma.sessionPayment.create({
                data: {
                    dutySessionId: input.shiftId,
                    paymentMethodId: input.paymentMethodId,
                    amount: new Prisma.Decimal(input.amount),
                    quantity: input.quantity,
                    coinsAmount: input.coinsAmount ? new Prisma.Decimal(input.coinsAmount) : null,
                },
                include: { paymentMethod: true },
            })

            // Create denomination records if provided
            if (input.denominations && input.denominations.length > 0) {
                await prisma.paymentDenomination.createMany({
                    data: input.denominations
                        .filter(d => d.count > 0)
                        .map(d => ({
                            sessionPaymentId: payment.id,
                            denominationId: d.denominationId,
                            count: d.count,
                        })),
                })
            }

            // Update total collected
            await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: {
                    totalPaymentCollected: {
                        increment: input.amount,
                    },
                },
            })

            return payment
        }),

    /**
     * Update payment
     */
    updatePayment: protectedProcedure
        .input(z.object({
            paymentId: z.number(),
            paymentMethodId: z.number().optional(),
            amount: z.number().min(0).optional(),
            quantity: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
            const { paymentId, ...data } = input
            const updateData: Record<string, unknown> = {}

            if (data.paymentMethodId) updateData.paymentMethodId = data.paymentMethodId
            if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount)
            if (data.quantity !== undefined) updateData.quantity = data.quantity

            // Get old payment for balance adjustment
            const oldPayment = await prisma.sessionPayment.findUnique({ where: { id: paymentId } })
            if (!oldPayment) throw new Error('Payment not found')

            const payment = await prisma.sessionPayment.update({
                where: { id: paymentId },
                data: updateData,
                include: { paymentMethod: true },
            })

            // Adjust total if amount changed
            if (data.amount !== undefined) {
                const diff = data.amount - Number(oldPayment.amount)
                await prisma.dutySession.update({
                    where: { id: payment.dutySessionId },
                    data: { totalPaymentCollected: { increment: diff } },
                })
            }

            return payment
        }),

    /**
     * Delete payment
     */
    deletePayment: protectedProcedure
        .input(z.object({ paymentId: z.number() }))
        .mutation(async ({ input }) => {
            const payment = await prisma.sessionPayment.findUnique({ where: { id: input.paymentId } })
            if (!payment) throw new Error('Payment not found')

            await prisma.sessionPayment.delete({ where: { id: input.paymentId } })

            // Decrease total
            await prisma.dutySession.update({
                where: { id: payment.dutySessionId },
                data: { totalPaymentCollected: { decrement: Number(payment.amount) } },
            })

            return { success: true }
        }),

    /**
     * Complete shift with closing readings
     */
    complete: protectedProcedure
        .input(z.object({
            shiftId: z.number(),
            readings: z.array(z.object({
                readingId: z.number(),
                closingReading: z.number().min(0),
            })).optional(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
                include: { nozzleReadings: true },
            })
            if (!shift) throw new Error('Shift not found')

            // Update closing readings and calculate fuel dispensed
            const readingsToProcess = input.readings || shift.nozzleReadings.map((r: any) => ({
                readingId: r.id,
                closingReading: Number(r.closingReading)
            }))

            for (const reading of readingsToProcess) {
                const nozzleReading = shift.nozzleReadings.find((r: { id: number }) => r.id === reading.readingId)
                if (!nozzleReading) continue

                // If input provided, update DB. If not, assume DB is up to date (incremental updates)
                if (input.readings) {
                    const fuelDispensed = reading.closingReading - Number(nozzleReading.openingReading) - Number(nozzleReading.testQty)
                    await prisma.nozzleSessionReading.update({
                        where: { id: reading.readingId },
                        data: {
                            closingReading: new Prisma.Decimal(reading.closingReading),
                            fuelDispensed: new Prisma.Decimal(Math.max(0, fuelDispensed)),
                        },
                    })
                }

                // Update nozzle current reading and release it
                await prisma.nozzle.update({
                    where: { id: nozzleReading.nozzleId },
                    data: {
                        currentreading: reading.closingReading,
                        isAvailable: true,
                    },
                })
            }

            // Complete shift - set to pending_verification for admin review
            const completedShift = await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: {
                    status: 'pending_verification',
                    endTime: new Date(),
                    notes: input.notes,
                },
                include: {
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true, dispenser: true } } },
                    },
                    sessionPayments: { include: { paymentMethod: true } },
                },
            })

            return completedShift
        }),

    /**
     * Update nozzle reading (Attendant)
     */
    updateNozzleReading: protectedProcedure
        .input(z.object({
            shiftId: z.number(),
            data: z.object({
                nozzleReadingId: z.number(),
                closingReading: z.number().optional(),
                testQty: z.number().optional(),
            })
        }))
        .mutation(async ({ input }) => {
            const { nozzleReadingId, closingReading, testQty } = input.data
            const reading = await prisma.nozzleSessionReading.findUnique({
                where: { id: nozzleReadingId },
                include: { nozzle: true }
            })
            if (!reading) throw new Error("Reading not found")

            // Prepare update data
            const updateData: any = {}
            if (closingReading !== undefined) updateData.closingReading = new Prisma.Decimal(closingReading)
            if (testQty !== undefined) updateData.testQty = new Prisma.Decimal(testQty)

            // Recalculate dispensed if closing reading is present or changing test qty
            const currentClosing = closingReading !== undefined ? closingReading : Number(reading.closingReading || 0)
            const currentTestQty = testQty !== undefined ? testQty : Number(reading.testQty)
            const opening = Number(reading.openingReading)

            // Only calculate if we have a closing reading (either existing or new)
            if (currentClosing > 0 || closingReading !== undefined) {
                const dispense = Math.max(0, currentClosing - opening - currentTestQty)
                updateData.fuelDispensed = new Prisma.Decimal(dispense)
            }

            await prisma.nozzleSessionReading.update({
                where: { id: nozzleReadingId },
                data: updateData
            })
            return { success: true }
        }),


    /**
     * Get shift summary
     */
    getSummary: protectedProcedure
        .input(z.object({ shiftId: z.number() }))
        .query(async ({ input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
                include: {
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true } } },
                    },
                    sessionPayments: { include: { paymentMethod: true } },
                },
            })
            if (!shift) throw new Error('Shift not found')

            // Calculate total sales
            // Calculate total sales and enrich readings
            let totalFuelSales = 0
            const enrichedReadings = shift.nozzleReadings.map((reading: any) => {
                const qty = Number(reading.fuelDispensed || 0)
                const price = Number(reading.nozzle.price)
                const amount = qty * price
                totalFuelSales += amount
                return {
                    ...reading,
                    price: reading.nozzle.price,
                    amount
                }
            })

            const totalCollected = Number(shift.totalPaymentCollected)
            const shortage = totalCollected - totalFuelSales

            return {
                ...shift,
                nozzleReadings: enrichedReadings,
                totalFuelSales,
                totalCollected,
                shortage,
            }
        }),


    /**
     * Get all shifts (for history page) with advanced filtering
     */
    getAll: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(20),
            offset: z.number().min(0).default(0),
            status: z.string().optional(),
            shiftType: z.nativeEnum(ShiftType).optional(),
            startDateFrom: z.date().optional(),
            startDateTo: z.date().optional(),
            endDateFrom: z.date().optional(),
            endDateTo: z.date().optional(),
            userId: z.number().optional(), // For admins to filter by attendant
            userNameSearch: z.string().optional(), // Search by name/username
        }))
        .query(async ({ ctx, input }) => {
            const where: any = {}
            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'

            // Status filter
            if (input.status) {
                where.status = input.status
            } else {
                where.status = { not: 'in_progress' } // By default show history (completed/archived)
            }

            // Shift type filter
            if (input.shiftType) {
                where.type = input.shiftType
            }

            // Date range filters on startTime (shift start date)
            if (input.startDateFrom || input.startDateTo) {
                where.startTime = {}
                if (input.startDateFrom) {
                    where.startTime.gte = input.startDateFrom
                }
                if (input.startDateTo) {
                    where.startTime.lte = input.startDateTo
                }
            }

            // Date range filters on endTime (shift end date)
            if (input.endDateFrom || input.endDateTo) {
                where.endTime = {}
                if (input.endDateFrom) {
                    where.endTime.gte = input.endDateFrom
                }
                if (input.endDateTo) {
                    where.endTime.lte = input.endDateTo
                }
            }

            // User search (admin only)
            if (isAdmin && input.userNameSearch) {
                where.user = {
                    OR: [
                        { name: { contains: input.userNameSearch, mode: 'insensitive' } },
                        { username: { contains: input.userNameSearch, mode: 'insensitive' } },
                    ],
                }
            }

            // Specific user filter (admin only)
            if (input.userId) {
                if (isAdmin) {
                    where.userId = input.userId
                }
            } else if (!isAdmin) {
                // Non-admin can only see their own history
                where.userId = ctx.user.id
            }

            const [shifts, total] = await Promise.all([
                prisma.dutySession.findMany({
                    where,
                    include: {
                        user: { select: { id: true, username: true, name: true } },
                        nozzleReadings: {
                            include: { nozzle: { include: { fuel: true } } },
                        },
                        sessionPayments: { include: { paymentMethod: true } },
                    },
                    orderBy: { endTime: 'desc' },
                    skip: input.offset,
                    take: input.limit,
                }),
                prisma.dutySession.count({ where }),
            ])

            return {
                sessions: shifts, // Client expects 'sessions' property
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                }
            }
        }),


    /**
     * Get shift by ID (for editing or viewing details)
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.id },
                include: {
                    user: { select: { id: true, username: true, name: true } },
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true, dispenser: true } } },
                    },
                    sessionPayments: { include: { paymentMethod: true } },
                },
            })
            if (!shift) throw new Error("Shift not found")

            // Security check: non-admins can only view their own shifts
            if (ctx.user.role !== 'Admin' && ctx.user.role !== 'Manager' && shift.userId !== ctx.user.id) {
                throw new Error("You do not have permission to view this shift")
            }

            // Calculate totals and enrich readings
            let totalFuelSales = 0
            const enrichedReadings = shift.nozzleReadings.map((reading: any) => {
                const qty = Number(reading.fuelDispensed || 0)
                const price = Number(reading.nozzle.price)
                const amount = qty * price
                totalFuelSales += amount
                return {
                    ...reading,
                    price: reading.nozzle.price,
                    amount
                }
            })

            const totalCollected = Number(shift.totalPaymentCollected)
            const shortage = totalCollected - totalFuelSales

            return {
                ...shift,
                nozzleReadings: enrichedReadings,
                totalFuelSales,
                totalCollected,
                shortage,
            }
        }),

    /**
     * Get shifts pending verification (admin only)
     */
    getPendingVerification: adminProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(20),
            offset: z.number().min(0).default(0),
        }))
        .query(async ({ input }) => {
            const [shifts, total] = await Promise.all([
                prisma.dutySession.findMany({
                    where: { status: 'pending_verification' },
                    include: {
                        user: { select: { id: true, username: true, name: true } },
                        nozzleReadings: {
                            include: { nozzle: { include: { fuel: true } } },
                        },
                        sessionPayments: { include: { paymentMethod: true } },
                    },
                    orderBy: { endTime: 'desc' },
                    skip: input.offset,
                    take: input.limit,
                }),
                prisma.dutySession.count({ where: { status: 'pending_verification' } }),
            ])

            return {
                sessions: shifts,
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                }
            }
        }),

    /**
     * Verify shift (admin only) - approve or reject
     */
    verifyShift: adminProcedure
        .input(z.object({
            shiftId: z.number(),
            approved: z.boolean(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
            })

            if (!shift) {
                throw new Error('Shift not found')
            }

            if (shift.status !== 'pending_verification') {
                throw new Error('Shift is not pending verification')
            }

            const updatedShift = await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: {
                    status: input.approved ? 'verified' : 'rejected',
                    verifiedAt: new Date(),
                    verifiedByUserId: ctx.user.id,
                    rejectionNotes: input.approved ? null : (input.notes || null),
                },
                include: {
                    user: { select: { id: true, username: true, name: true } },
                    verifiedBy: { select: { id: true, username: true, name: true } },
                },
            })

            return updatedShift
        }),

    /**
     * Resubmit rejected shift for verification (user who created it or admin)
     */
    resubmitForVerification: protectedProcedure
        .input(z.object({
            shiftId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
            })

            if (!shift) {
                throw new Error('Shift not found')
            }

            // Only the shift owner or admin can resubmit
            if (shift.userId !== ctx.user.id && ctx.user.role !== 'Admin' && ctx.user.role !== 'Manager') {
                throw new Error('You do not have permission to resubmit this shift')
            }

            if (shift.status !== 'rejected') {
                throw new Error('Only rejected shifts can be resubmitted')
            }

            const updatedShift = await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: {
                    status: 'pending_verification',
                    verifiedAt: null,
                    verifiedByUserId: null,
                    rejectionNotes: null,
                },
            })

            return updatedShift
        }),

    /**
     * Update completed shift (admin only)
     */
    updateCompleted: adminProcedure
        .input(z.object({
            shiftId: z.number(),
            readings: z.array(z.object({
                readingId: z.number(),
                openingReading: z.number().optional(),
                closingReading: z.number().optional(),
                testQty: z.number().optional(),
            })).optional(),
            notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
            if (input.readings) {
                for (const reading of input.readings) {
                    const nozzleReading = await prisma.nozzleSessionReading.findUnique({
                        where: { id: reading.readingId },
                    })
                    if (!nozzleReading) continue

                    const openingReading = reading.openingReading ?? Number(nozzleReading.openingReading)
                    const closingReading = reading.closingReading ?? Number(nozzleReading.closingReading ?? 0)
                    const testQty = reading.testQty ?? Number(nozzleReading.testQty)
                    const fuelDispensed = Math.max(0, closingReading - openingReading - testQty)

                    await prisma.nozzleSessionReading.update({
                        where: { id: reading.readingId },
                        data: {
                            openingReading: new Prisma.Decimal(openingReading),
                            closingReading: new Prisma.Decimal(closingReading),
                            testQty: new Prisma.Decimal(testQty),
                            fuelDispensed: new Prisma.Decimal(fuelDispensed),
                        },
                    })
                }
            }

            if (input.notes !== undefined) {
                await prisma.dutySession.update({
                    where: { id: input.shiftId },
                    data: { notes: input.notes },
                })
            }

            return { success: true }
        }),
    /**
     * Admin: Update shift details
     */
    /**
     * Admin: Update shift details
     */
    adminUpdateShift: adminProcedure
        .input(z.object({
            shiftId: z.number(),
            data: z.object({
                shiftType: z.nativeEnum(ShiftType).optional(),
                status: z.string().optional(),
                notes: z.string().optional(),
            })
        }))
        .mutation(async ({ input }) => {
            return prisma.dutySession.update({
                where: { id: input.shiftId },
                data: {
                    type: input.data.shiftType,
                    status: input.data.status,
                    notes: input.data.notes,
                }
            })
        }),

    /**
     * Admin: Update individual nozzle reading
     */
    adminUpdateNozzleReading: adminProcedure
        .input(z.object({
            shiftId: z.number(),
            readingId: z.number(),
            data: z.object({
                openingReading: z.number().optional(),
                closingReading: z.number().optional(),
                testQty: z.number().optional(),
            })
        }))
        .mutation(async ({ input }) => {
            // Update the reading
            const reading = await prisma.nozzleSessionReading.update({
                where: { id: input.readingId },
                data: {
                    openingReading: input.data.openingReading ? new Prisma.Decimal(input.data.openingReading) : undefined,
                    closingReading: input.data.closingReading ? new Prisma.Decimal(input.data.closingReading) : undefined,
                    testQty: input.data.testQty ? new Prisma.Decimal(input.data.testQty) : undefined,
                }
            })

            // Recalculate fuel dispensed
            const updatedReading = await prisma.nozzleSessionReading.findUnique({ where: { id: input.readingId } })
            if (updatedReading) {
                const fuelDispensed = Math.max(0, Number(updatedReading.closingReading || 0) - Number(updatedReading.openingReading || 0) - Number(updatedReading.testQty || 0))
                await prisma.nozzleSessionReading.update({
                    where: { id: input.readingId },
                    data: { fuelDispensed: new Prisma.Decimal(fuelDispensed) }
                })
            }
            return { success: true }
        }),

    /**
     * Admin: Add payment
     */
    adminAddPayment: adminProcedure
        .input(z.object({
            shiftId: z.number(),
            data: z.object({
                paymentMethodId: z.number(),
                amount: z.number(),
            })
        }))
        .mutation(async ({ input }) => {
            const payment = await prisma.sessionPayment.create({
                data: {
                    dutySessionId: input.shiftId,
                    paymentMethodId: input.data.paymentMethodId,
                    amount: new Prisma.Decimal(input.data.amount),
                },
                include: { paymentMethod: true },
            })
            // Update total
            await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: {
                    totalPaymentCollected: { increment: input.data.amount },
                },
            })
            return payment
        }),

    /**
     * Admin: Update payment
     */
    adminUpdatePayment: adminProcedure
        .input(z.object({
            shiftId: z.number(),
            paymentId: z.number(),
            data: z.object({
                amount: z.number(),
            })
        }))
        .mutation(async ({ input }) => {
            const oldPayment = await prisma.sessionPayment.findUnique({ where: { id: input.paymentId } })
            if (!oldPayment) throw new Error("Payment not found")

            const diff = input.data.amount - Number(oldPayment.amount)

            const payment = await prisma.sessionPayment.update({
                where: { id: input.paymentId },
                data: { amount: new Prisma.Decimal(input.data.amount) },
                include: { paymentMethod: true },
            })

            if (diff !== 0) {
                await prisma.dutySession.update({
                    where: { id: input.shiftId },
                    data: { totalPaymentCollected: { increment: diff } },
                })
            }
            return payment
        }),

    /**
     * Admin: Delete payment
     */
    adminDeletePayment: adminProcedure
        .input(z.object({
            shiftId: z.number(),
            paymentId: z.number(),
        }))
        .mutation(async ({ input }) => {
            const payment = await prisma.sessionPayment.findUnique({ where: { id: input.paymentId } })
            if (!payment) throw new Error("Payment not found")

            await prisma.sessionPayment.delete({ where: { id: input.paymentId } })

            await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: { totalPaymentCollected: { decrement: Number(payment.amount) } },
            })

            return { success: true }
        })
})
