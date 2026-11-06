import { z } from 'zod'
import { Prisma, ShiftType } from '@prisma/client'
import { router, tenantProcedure, adminProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'

interface ShiftForSummary {
    id: number
    status: string
    totalPaymentCollected: Prisma.Decimal | number
    nozzleReadings: Array<{
        fuelDispensed: Prisma.Decimal | number | null
        fuelPrice: Prisma.Decimal | number | null
        nozzle: {
            price: Prisma.Decimal | number
        }
    }>
    sessionProducts?: Array<{
        amount: Prisma.Decimal | number
    }>
}

function calculateShiftsSummary(
    summaryShifts: ShiftForSummary[],
    totalCount: number,
    targetUser: { id: number; name: string | null; username: string } | null = null
) {
    let totalFuelSales = 0
    let totalProductSales = 0
    let totalPaymentsCollected = 0
    let totalShortage = 0
    let totalExcess = 0
    let shortageCount = 0
    let excessCount = 0
    let settledCount = 0
    let completedShiftsCount = 0

    const statusCounts = {
        verified: 0,
        pending_verification: 0,
        rejected: 0,
        in_progress: 0,
        completed: 0,
    }

    for (const s of summaryShifts) {
        if (s.status in statusCounts) {
            statusCounts[s.status as keyof typeof statusCounts]++
        }

        // Only calculate financials for non-in-progress shifts
        if (s.status === 'in_progress') {
            continue
        }

        completedShiftsCount++
        let shiftFuelSales = 0
        for (const nr of s.nozzleReadings) {
            const qty = Number(nr.fuelDispensed || 0)
            const price = Number(nr.fuelPrice && Number(nr.fuelPrice) > 0 ? nr.fuelPrice : (nr.nozzle?.price ?? 0))
            shiftFuelSales += qty * price
        }

        let shiftProductSales = 0
        if (s.sessionProducts) {
            for (const sp of s.sessionProducts) {
                shiftProductSales += Number(sp.amount || 0)
            }
        }

        const shiftTotalSales = shiftFuelSales + shiftProductSales
        const shiftPayment = Number(s.totalPaymentCollected || 0)
        const diff = shiftPayment - shiftTotalSales

        totalFuelSales += shiftFuelSales
        totalProductSales += shiftProductSales
        totalPaymentsCollected += shiftPayment

        if (diff < -0.01) {
            totalShortage += Math.abs(diff)
            shortageCount++
        } else if (diff > 0.01) {
            totalExcess += diff
            excessCount++
        } else {
            settledCount++
        }
    }

    const totalSales = totalFuelSales + totalProductSales
    const netDifference = totalPaymentsCollected - totalSales

    return {
        totalShifts: totalCount,
        completedShiftsCount,
        totalFuelSales: Math.round(totalFuelSales * 100) / 100,
        totalProductSales: Math.round(totalProductSales * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        totalPaymentsCollected: Math.round(totalPaymentsCollected * 100) / 100,
        netDifference: Math.round(netDifference * 100) / 100,
        totalShortage: Math.round(totalShortage * 100) / 100,
        totalExcess: Math.round(totalExcess * 100) / 100,
        shortageCount,
        excessCount,
        settledCount,
        statusCounts,
        targetUser,
    }
}

export const shiftRouter = router({
    /**
     * Get active shift for current user
     */
    getActive: tenantProcedure.query(async ({ ctx }) => {
        const shift = await prisma.dutySession.findFirst({
            where: {
                stationId: ctx.stationId,
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
                sessionProducts: {
                    include: {
                        product: true,
                    },
                    orderBy: { createdAt: 'desc' },
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
    start: tenantProcedure
        .input(z.object({
            shiftType: z.nativeEnum(ShiftType),
            nozzleIds: z.array(z.number()).min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            // Check for existing active shift
            const existingShift = await prisma.dutySession.findFirst({
                where: { stationId: ctx.stationId, userId: ctx.user.id, status: 'in_progress' },
            })
            if (existingShift) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already have an active shift' })
            }

            // Get nozzles with current readings (station-scoped)
            const nozzles = await prisma.nozzle.findMany({
                where: { id: { in: input.nozzleIds }, stationId: ctx.stationId },
            })

            // Create shift with nozzle readings
            const shift = await prisma.dutySession.create({
                data: {
                    stationId: ctx.stationId,
                    userId: ctx.user.id,
                    type: input.shiftType,
                    nozzleReadings: {
                        create: nozzles.map((nozzle: { id: number; currentreading: number; price: number }) => ({
                            nozzleId: nozzle.id,
                            openingReading: new Prisma.Decimal(nozzle.currentreading),
                            fuelPrice: new Prisma.Decimal(nozzle.price),
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
    updateTestQty: tenantProcedure
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
    addPayment: tenantProcedure
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
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift) throw new Error('Shift not found')
            if (shift.status === 'verified') {
                throw new Error('Cannot add payment to a verified shift')
            }

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
    updatePayment: tenantProcedure
        .input(z.object({
            paymentId: z.number(),
            paymentMethodId: z.number().optional(),
            amount: z.number().min(0).optional(),
            quantity: z.number().optional(),
            denominations: z.array(z.object({
                denominationId: z.number(),
                count: z.number().min(0),
            })).optional(),
            coinsAmount: z.number().min(0).optional(),
        }))
        .mutation(async ({ input }) => {
            const { paymentId, ...data } = input
            const updateData: Record<string, unknown> = {}

            if (data.paymentMethodId) updateData.paymentMethodId = data.paymentMethodId
            if (data.amount !== undefined) updateData.amount = new Prisma.Decimal(data.amount)
            if (data.quantity !== undefined) updateData.quantity = data.quantity
            if (data.coinsAmount !== undefined) updateData.coinsAmount = new Prisma.Decimal(data.coinsAmount)

            // Get old payment for balance adjustment
            const oldPayment = await prisma.sessionPayment.findUnique({
                where: { id: paymentId },
                include: { dutySession: true }
            })
            if (!oldPayment) throw new Error('Payment not found')

            if (oldPayment.dutySession.status === 'verified') {
                throw new Error('Cannot edit a payment in a verified shift')
            }

            const payment = await prisma.sessionPayment.update({
                where: { id: paymentId },
                data: updateData,
                include: { paymentMethod: true },
            })

            // Update denominations if provided
            if (data.denominations) {
                // Delete existing
                await prisma.paymentDenomination.deleteMany({
                    where: { sessionPaymentId: paymentId }
                })

                // Create new
                if (data.denominations.length > 0) {
                    await prisma.paymentDenomination.createMany({
                        data: data.denominations
                            .filter(d => d.count > 0)
                            .map(d => ({
                                sessionPaymentId: payment.id,
                                denominationId: d.denominationId,
                                count: d.count,
                            })),
                    })
                }
            }

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
    /**
     * Add product sale to shift
     */
    addProductSale: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            productId: z.number(),
            quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
            price: z.number().min(0).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findFirst({
                where: { id: input.shiftId, stationId: ctx.stationId }
            })
            if (!shift) throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })
            if (shift.status !== 'in_progress') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot add products to a shift that is not in progress' })
            }

            const product = await prisma.product.findFirst({
                where: { id: input.productId, stationId: ctx.stationId, deletedAt: null }
            })
            if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })

            const priceToUse = input.price !== undefined ? input.price : product.rate
            const amount = input.quantity * priceToUse

            const sessionProduct = await prisma.sessionProduct.create({
                data: {
                    dutySessionId: input.shiftId,
                    productId: input.productId,
                    quantity: new Prisma.Decimal(input.quantity),
                    price: new Prisma.Decimal(priceToUse),
                    amount: new Prisma.Decimal(amount),
                },
                include: { product: true }
            })

            return sessionProduct
        }),

    /**
     * Update product sale
     */
    updateProductSale: tenantProcedure
        .input(z.object({
            id: z.number(),
            quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
            price: z.number().min(0).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const existing = await prisma.sessionProduct.findUnique({
                where: { id: input.id },
                include: { dutySession: true, product: true }
            })
            if (!existing || existing.dutySession.stationId !== ctx.stationId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Product sale record not found' })
            }
            if (existing.dutySession.status !== 'in_progress') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift is not in progress' })
            }

            const priceToUse = input.price !== undefined ? input.price : Number(existing.price)
            const amount = input.quantity * priceToUse

            return prisma.sessionProduct.update({
                where: { id: input.id },
                data: {
                    quantity: new Prisma.Decimal(input.quantity),
                    price: new Prisma.Decimal(priceToUse),
                    amount: new Prisma.Decimal(amount),
                },
                include: { product: true }
            })
        }),

    /**
     * Delete product sale
     */
    deleteProductSale: tenantProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const existing = await prisma.sessionProduct.findUnique({
                where: { id: input.id },
                include: { dutySession: true }
            })
            if (!existing || existing.dutySession.stationId !== ctx.stationId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Product sale record not found' })
            }
            if (existing.dutySession.status !== 'in_progress') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift is not in progress' })
            }

            await prisma.sessionProduct.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),

    deletePayment: tenantProcedure
        .input(z.object({ paymentId: z.number() }))
        .mutation(async ({ input }) => {
            const payment = await prisma.sessionPayment.findUnique({
                where: { id: input.paymentId },
                include: { dutySession: true }
            })
            if (!payment) throw new Error('Payment not found')

            if (payment.dutySession.status === 'verified') {
                throw new Error('Cannot delete a payment in a verified shift')
            }

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
    complete: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            readings: z.array(z.object({
                readingId: z.number(),
                closingReading: z.number().min(0),
            })).optional(),
            notes: z.string().optional(),
            endTime: z.date().optional(),
        }))
        .mutation(async ({ input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
                include: { nozzleReadings: true },
            })
            if (!shift) throw new Error('Shift not found')

            // Verify all nozzles have closing readings
            for (const nozzleReading of shift.nozzleReadings) {
                const inputReading = input.readings?.find(r => r.readingId === nozzleReading.id)
                const closingVal = inputReading ? inputReading.closingReading : Number(nozzleReading.closingReading)

                // Check if we have a valid number (considering 0 is valid if opening is 0, but generally we want non-null)
                // The issue describes "without updating closing reading", implying it might be null or missing.
                // In Prisma, Decimal? can be null. Number(null) is 0, but reading.closingReading would be null in DB.
                // If it's explicitly passed as 0 in input, that's a value.

                const hasInput = inputReading !== undefined
                const hasDbValue = nozzleReading.closingReading !== null

                if (!hasInput && !hasDbValue) {
                    throw new Error(`Missing closing reading for nozzle ${nozzleReading.nozzleId}`)
                }
            }

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
                    endTime: input.endTime || new Date(),
                    notes: input.notes,
                },
                include: {
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true, dispenser: true } } },
                    },
                    sessionProducts: {
                    include: {
                        product: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                sessionPayments: { include: { paymentMethod: true } },
                },
            })

            return completedShift
        }),

    /**
     * Update nozzle reading (Attendant)
     */
    updateNozzleReading: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            data: z.object({
                nozzleReadingId: z.number(),
                closingReading: z.number().optional(),
                testQty: z.number().optional(),
            })
        }))
        .mutation(async ({ input }) => {
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift) throw new Error('Shift not found')
            if (shift.status === 'verified') {
                throw new Error('Cannot edit reading in a verified shift')
            }

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
     * Add nozzle to active shift
     */
    addNozzle: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            nozzleId: z.number(),
        }))
        .mutation(async ({ input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
            })
            if (!shift) throw new Error('Shift not found')
            if (shift.status !== 'in_progress') throw new Error('Shift is not in progress')

            // Check if nozzle available
            const nozzle = await prisma.nozzle.findUnique({
                where: { id: input.nozzleId },
            })
            if (!nozzle) throw new Error('Nozzle not found')
            if (!nozzle.isAvailable) throw new Error('Nozzle is not available')
            if (!nozzle.isActive) throw new Error('Nozzle is not active')

            // Add to shift
            await prisma.nozzleSessionReading.create({
                data: {
                    dutySessionId: input.shiftId,
                    nozzleId: input.nozzleId,
                    openingReading: new Prisma.Decimal(nozzle.currentreading),
                    fuelPrice: new Prisma.Decimal(nozzle.price),
                },
            })

            // Mark unavailable
            await prisma.nozzle.update({
                where: { id: input.nozzleId },
                data: { isAvailable: false },
            })

            return { success: true }
        }),

    /**
     * Remove nozzle from active shift
     */
    removeNozzle: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            nozzleId: z.number(),
        }))
        .mutation(async ({ input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
                include: { nozzleReadings: true }
            })
            if (!shift) throw new Error('Shift not found')
            if (shift.status !== 'in_progress') throw new Error('Shift is not in progress')

            // Check if multiple nozzles exist
            if (shift.nozzleReadings.length <= 1) {
                throw new Error('Cannot remove the last nozzle from current shift')
            }

            // Find reading
            const reading = shift.nozzleReadings.find(r => r.nozzleId === input.nozzleId)
            if (!reading) throw new Error('Nozzle not part of this shift')

            // Check if sales recorded (closing reading exists and > opening)
            // Or if test qty added
            if (reading.closingReading !== null) {
                throw new Error('Cannot remove nozzle after sales have been recorded')
            }
            if (Number(reading.testQty) > 0) {
                throw new Error('Cannot remove nozzle with test quantity recorded')
            }

            // Remove reading
            await prisma.nozzleSessionReading.delete({
                where: { id: reading.id }
            })

            // Mark nozzle as available
            await prisma.nozzle.update({
                where: { id: input.nozzleId },
                data: { isAvailable: true }
            })

            return { success: true }
        }),


    /**
     * Get shift summary
     */
    getSummary: tenantProcedure
        .input(z.object({ shiftId: z.number() }))
        .query(async ({ input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
                include: {
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true } } },
                    },
                    sessionProducts: {
                    include: {
                        product: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                sessionPayments: {
                        include: {
                            paymentMethod: true,
                            denominations: { include: { denomination: true } },
                        }
                    },

                },
            })
            if (!shift) throw new Error('Shift not found')

            // Calculate total sales and enrich readings
            let totalFuelSales = 0
            const enrichedReadings = shift.nozzleReadings.map((reading: any) => {
                const qty = Number(reading.fuelDispensed || 0)
                const price = Number(reading.fuelPrice && Number(reading.fuelPrice) > 0 ? reading.fuelPrice : reading.nozzle.price)
                const amount = qty * price
                totalFuelSales += amount
                return {
                    ...reading,
                    price,
                    amount
                }
            })

            const totalCollected = Number(shift.totalPaymentCollected)
            let totalProductSales = 0
            const enrichedProducts = (shift.sessionProducts || []).map((sp: any) => {
                const qty = Number(sp.quantity || 0)
                const price = Number(sp.price || 0)
                const amount = Number(sp.amount || (qty * price))
                totalProductSales += amount
                return {
                    ...sp,
                    quantity: qty,
                    price,
                    amount
                }
            })

            const totalShiftSales = totalFuelSales + totalProductSales
            const shortage = totalCollected - totalShiftSales

            return {
                ...shift,
                nozzleReadings: enrichedReadings,
                sessionProducts: enrichedProducts,
                totalProductSales,
                totalShiftSales,
                totalFuelSales,
                totalCollected,
                shortage,
            }
        }),


    /**
     * Get all shifts (for history page) with advanced filtering
     */
    getAll: tenantProcedure
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
            const where: Record<string, unknown> = { stationId: ctx.stationId }
            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager' || ctx.isSuperAdmin

            // Status filter
            if (input.status) {
                where.status = input.status
            }
            // Removed default exclusion of 'in_progress' to show all shifts

            // Shift type filter
            if (input.shiftType) {
                where.type = input.shiftType
            }

            // Date range filters on startTime (shift start date)
            if (input.startDateFrom || input.startDateTo) {
                where.startTime = {}
                if (input.startDateFrom) {
                    const start = new Date(input.startDateFrom);
                    (where.startTime as Record<string, unknown>).gte = start
                }
                if (input.startDateTo) {
                    const end = new Date(input.startDateTo)
                    end.setDate(end.getDate() + 1);
                    (where.startTime as Record<string, unknown>).lt = end
                }
            }

            // Date range filters on endTime (shift end date)
            if (input.endDateFrom || input.endDateTo) {
                where.endTime = {}
                if (input.endDateFrom) {
                    const start = new Date(input.endDateFrom)
                    start.setHours(0, 0, 0, 0);
                    (where.endTime as Record<string, unknown>).gte = start
                }
                if (input.endDateTo) {
                    const end = new Date(input.endDateTo)
                    end.setHours(0, 0, 0, 0)
                    end.setDate(end.getDate() + 1);
                    (where.endTime as Record<string, unknown>).lt = end
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

            const targetUserId = where.userId as number | undefined

            const [shifts, total, summaryShifts, targetUser] = await Promise.all([
                prisma.dutySession.findMany({
                    where,
                    include: {
                        user: { select: { id: true, username: true, name: true } },
                        nozzleReadings: {
                            include: { nozzle: { include: { fuel: true } } },
                        },
                        sessionProducts: {
                    include: {
                        product: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                sessionPayments: { include: { paymentMethod: true } },
                        editRequests: {
                            where: { status: "pending" },
                            include: { requestedByUser: { select: { id: true, name: true, username: true } } }
                        }
                    },
                    orderBy: { startTime: 'desc' },
                    skip: input.offset,
                    take: input.limit,
                }),
                prisma.dutySession.count({ where }),
                prisma.dutySession.findMany({
                    where,
                    select: {
                        id: true,
                        status: true,
                        totalPaymentCollected: true,
                        nozzleReadings: {
                            select: {
                                fuelDispensed: true,
                                fuelPrice: true,
                                nozzle: { select: { price: true } },
                            },
                        },
                        sessionProducts: {
                            select: { amount: true },
                        },
                    },
                }),
                targetUserId ? prisma.user.findUnique({
                    where: { id: targetUserId },
                    select: { id: true, name: true, username: true }
                }) : Promise.resolve(null),
            ])

            const summary = calculateShiftsSummary(summaryShifts as any, total, targetUser)

            return {
                sessions: shifts, // Client expects 'sessions' property
                pagination: {
                    total,
                    limit: input.limit,
                    offset: input.offset,
                },
                summary,
            }
        }),

    /**
     * Get shift history summary (aggregated metrics, cumulative shortage/excess)
     */
    getHistorySummary: tenantProcedure
        .input(z.object({
            status: z.string().optional(),
            shiftType: z.nativeEnum(ShiftType).optional(),
            startDateFrom: z.date().optional(),
            startDateTo: z.date().optional(),
            endDateFrom: z.date().optional(),
            endDateTo: z.date().optional(),
            userId: z.number().optional(),
            userNameSearch: z.string().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const where: Record<string, unknown> = { stationId: ctx.stationId }
            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager' || ctx.isSuperAdmin

            if (input.status) {
                where.status = input.status
            }
            if (input.shiftType) {
                where.type = input.shiftType
            }

            if (input.startDateFrom || input.startDateTo) {
                where.startTime = {}
                if (input.startDateFrom) {
                    const start = new Date(input.startDateFrom)
                    ;(where.startTime as Record<string, unknown>).gte = start
                }
                if (input.startDateTo) {
                    const end = new Date(input.startDateTo)
                    end.setDate(end.getDate() + 1)
                    ;(where.startTime as Record<string, unknown>).lt = end
                }
            }

            if (input.endDateFrom || input.endDateTo) {
                where.endTime = {}
                if (input.endDateFrom) {
                    const start = new Date(input.endDateFrom)
                    start.setHours(0, 0, 0, 0)
                    ;(where.endTime as Record<string, unknown>).gte = start
                }
                if (input.endDateTo) {
                    const end = new Date(input.endDateTo)
                    end.setHours(0, 0, 0, 0)
                    end.setDate(end.getDate() + 1)
                    ;(where.endTime as Record<string, unknown>).lt = end
                }
            }

            if (isAdmin && input.userNameSearch) {
                where.user = {
                    OR: [
                        { name: { contains: input.userNameSearch, mode: 'insensitive' } },
                        { username: { contains: input.userNameSearch, mode: 'insensitive' } },
                    ],
                }
            }

            if (input.userId) {
                if (isAdmin) {
                    where.userId = input.userId
                }
            } else if (!isAdmin) {
                where.userId = ctx.user.id
            }

            const targetUserId = where.userId as number | undefined

            const [summaryShifts, targetUser] = await Promise.all([
                prisma.dutySession.findMany({
                    where,
                    select: {
                        id: true,
                        status: true,
                        totalPaymentCollected: true,
                        nozzleReadings: {
                            select: {
                                fuelDispensed: true,
                                fuelPrice: true,
                                nozzle: { select: { price: true } },
                            },
                        },
                        sessionProducts: {
                            select: { amount: true },
                        },
                    },
                }),
                targetUserId ? prisma.user.findUnique({
                    where: { id: targetUserId },
                    select: { id: true, name: true, username: true }
                }) : Promise.resolve(null),
            ])

            const summary = calculateShiftsSummary(summaryShifts as any, summaryShifts.length, targetUser)

            return summary
        }),


    /**
     * Get shift by ID (for editing or viewing details)
     */
    getById: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.id },
                include: {
                    user: { select: { id: true, username: true, name: true } },
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true, dispenser: true } } },
                    },
                    sessionProducts: {
                    include: {
                        product: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                sessionPayments: {
                        include: {
                            paymentMethod: true,
                            denominations: { include: { denomination: true } },
                        }
                    },
                    editRequests: {
                        where: { status: 'pending' },
                        include: { requestedByUser: { select: { id: true, name: true, username: true } } }
                    }

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
                const price = Number(reading.fuelPrice && Number(reading.fuelPrice) > 0 ? reading.fuelPrice : reading.nozzle.price)
                const amount = qty * price
                totalFuelSales += amount
                return {
                    ...reading,
                    price,
                    amount
                }
            })

            const totalCollected = Number(shift.totalPaymentCollected)
            let totalProductSales = 0
            const enrichedProducts = (shift.sessionProducts || []).map((sp: any) => {
                const qty = Number(sp.quantity || 0)
                const price = Number(sp.price || 0)
                const amount = Number(sp.amount || (qty * price))
                totalProductSales += amount
                return {
                    ...sp,
                    quantity: qty,
                    price,
                    amount
                }
            })

            const totalShiftSales = totalFuelSales + totalProductSales
            const shortage = totalCollected - totalShiftSales

            return {
                ...shift,
                nozzleReadings: enrichedReadings,
                sessionProducts: enrichedProducts,
                totalProductSales,
                totalShiftSales,
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
        .query(async ({ ctx, input }) => {
            const [shifts, total] = await Promise.all([
                prisma.dutySession.findMany({
                    where: { stationId: ctx.stationId, status: 'pending_verification' },
                    include: {
                        user: { select: { id: true, username: true, name: true } },
                        nozzleReadings: {
                            include: { nozzle: { include: { fuel: true } } },
                        },
                        sessionProducts: {
                    include: {
                        product: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
                sessionPayments: { include: { paymentMethod: true } },
                    },
                    orderBy: { endTime: 'desc' },
                    skip: input.offset,
                    take: input.limit,
                }),
                prisma.dutySession.count({ where: { stationId: ctx.stationId, status: 'pending_verification' } }),
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
    resubmitForVerification: tenantProcedure
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
            // Check shift status
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift) throw new Error('Shift not found')
            if (shift.status === 'verified') {
                throw new Error('Cannot edit a verified shift')
            }

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
    adminUpdateShift: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            data: z.object({
                shiftType: z.nativeEnum(ShiftType).optional(),
                status: z.string().optional(),
                notes: z.string().optional(),
                startTime: z.date().optional(),
                endTime: z.date().optional(),
            })
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift) throw new Error('Shift not found')

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = shift.userId === ctx.user.id
            const isRejected = shift.status === 'rejected'

            if (!isAdmin && !(isOwner && isRejected)) {
                throw new Error('You do not have permission to edit this shift')
            }

            if (shift.status === 'verified') {
                throw new Error('Cannot edit a verified shift')
            }

            return prisma.dutySession.update({
                where: { id: input.shiftId },
                data: {
                    type: input.data.shiftType,
                    status: input.data.status,
                    notes: input.data.notes,
                    startTime: input.data.startTime,
                    endTime: input.data.endTime,
                }
            })
        }),

    /**
     * Admin: Update individual nozzle reading
     */
    adminUpdateNozzleReading: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            readingId: z.number(),
            data: z.object({
                openingReading: z.number().optional(),
                closingReading: z.number().optional(),
                testQty: z.number().optional(),
                fuelPrice: z.number().min(0).optional(),
            })
        }))
        .mutation(async ({ ctx, input }) => {
            // Check shift status
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift) throw new Error('Shift not found')

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = shift.userId === ctx.user.id
            const isRejected = shift.status === 'rejected'

            if (!isAdmin && !(isOwner && isRejected)) {
                throw new Error('You do not have permission to edit this shift')
            }

            if (shift.status === 'verified') {
                throw new Error('Cannot edit a verified shift')
            }

            // Update the reading
            const reading = await prisma.nozzleSessionReading.update({
                where: { id: input.readingId },
                data: {
                    openingReading: input.data.openingReading !== undefined ? new Prisma.Decimal(input.data.openingReading) : undefined,
                    closingReading: input.data.closingReading !== undefined ? new Prisma.Decimal(input.data.closingReading) : undefined,
                    testQty: input.data.testQty !== undefined ? new Prisma.Decimal(input.data.testQty) : undefined,
                    fuelPrice: input.data.fuelPrice !== undefined ? new Prisma.Decimal(input.data.fuelPrice) : undefined,
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
    adminAddPayment: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            data: z.object({
                paymentMethodId: z.number(),
                amount: z.number(),
                denominations: z.array(z.object({
                    denominationId: z.number(),
                    count: z.number().min(0),
                })).optional(),
                coinsAmount: z.number().min(0).optional(),
            })
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift) throw new Error('Shift not found')

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = shift.userId === ctx.user.id
            const isRejected = shift.status === 'rejected'

            if (!isAdmin && !(isOwner && isRejected)) {
                throw new Error('You do not have permission to add payments to this shift')
            }

            if (shift.status === 'verified') {
                throw new Error('Cannot add payment to a verified shift')
            }

            const payment = await prisma.sessionPayment.create({
                data: {
                    dutySessionId: input.shiftId,
                    paymentMethodId: input.data.paymentMethodId,
                    amount: new Prisma.Decimal(input.data.amount),
                    coinsAmount: input.data.coinsAmount ? new Prisma.Decimal(input.data.coinsAmount) : null,
                },
                include: { paymentMethod: true },
            })

            // Create denomination records if provided
            if (input.data.denominations && input.data.denominations.length > 0) {
                await prisma.paymentDenomination.createMany({
                    data: input.data.denominations
                        .filter(d => d.count > 0)
                        .map(d => ({
                            sessionPaymentId: payment.id,
                            denominationId: d.denominationId,
                            count: d.count,
                        })),
                })
            }

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
    adminUpdatePayment: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            paymentId: z.number(),
            data: z.object({
                paymentMethodId: z.number().optional(),
                amount: z.number().optional(),
                denominations: z.array(z.object({
                    denominationId: z.number(),
                    count: z.number().min(0),
                })).optional(),
                coinsAmount: z.number().min(0).optional(),
            })
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift) throw new Error('Shift not found')

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = shift.userId === ctx.user.id
            const isRejected = shift.status === 'rejected'

            if (!isAdmin && !(isOwner && isRejected)) {
                throw new Error('You do not have permission to edit payments in this shift')
            }

            if (shift.status === 'verified') {
                throw new Error('Cannot edit payment in a verified shift')
            }

            const oldPayment = await prisma.sessionPayment.findUnique({ where: { id: input.paymentId } })
            if (!oldPayment) throw new Error("Payment not found")

            // Prepare update data
            const updateData: any = {}
            if (input.data.paymentMethodId) updateData.paymentMethodId = input.data.paymentMethodId
            if (input.data.amount !== undefined) updateData.amount = new Prisma.Decimal(input.data.amount)
            if (input.data.coinsAmount !== undefined) updateData.coinsAmount = new Prisma.Decimal(input.data.coinsAmount)

            const payment = await prisma.sessionPayment.update({
                where: { id: input.paymentId },
                data: updateData,
                include: { paymentMethod: true },
            })

            // Update denominations if provided
            if (input.data.denominations) {
                // Delete existing
                await prisma.paymentDenomination.deleteMany({
                    where: { sessionPaymentId: input.paymentId }
                })

                // Create new
                if (input.data.denominations.length > 0) {
                    await prisma.paymentDenomination.createMany({
                        data: input.data.denominations
                            .filter(d => d.count > 0)
                            .map(d => ({
                                sessionPaymentId: payment.id,
                                denominationId: d.denominationId,
                                count: d.count,
                            })),
                    })
                }
            }

            // Adjust total if amount changed
            if (input.data.amount !== undefined) {
                const diff = input.data.amount - Number(oldPayment.amount)
                if (diff !== 0) {
                    await prisma.dutySession.update({
                        where: { id: input.shiftId },
                        data: { totalPaymentCollected: { increment: diff } },
                    })
                }
            }
            return payment
        }),

    /**
     * Admin: Delete payment
     */
    adminDeletePayment: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            paymentId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift) throw new Error('Shift not found')

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = shift.userId === ctx.user.id
            const isRejected = shift.status === 'rejected'

            if (!isAdmin && !(isOwner && isRejected)) {
                throw new Error('You do not have permission to delete payments from this shift')
            }

            if (shift.status === 'verified') {
                throw new Error('Cannot delete payment from a verified shift')
            }

            const payment = await prisma.sessionPayment.findUnique({ where: { id: input.paymentId } })
            if (!payment) throw new Error("Payment not found")

            await prisma.sessionPayment.delete({ where: { id: input.paymentId } })

            await prisma.dutySession.update({
                where: { id: input.shiftId },
                data: { totalPaymentCollected: { decrement: Number(payment.amount) } },
            })

            return { success: true }
        }),

    /**
     * Admin: Add product sale
     */
    adminAddProductSale: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            productId: z.number(),
            quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
            price: z.number().min(0).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift || shift.stationId !== ctx.stationId) throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = shift.userId === ctx.user.id
            const isRejected = shift.status === 'rejected'

            if (!isAdmin && !(isOwner && isRejected)) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to edit this shift' })
            }

            if (shift.status === 'verified') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot edit a verified shift' })
            }

            const product = await prisma.product.findFirst({
                where: { id: input.productId, stationId: ctx.stationId, deletedAt: null }
            })
            if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })

            const priceToUse = input.price !== undefined ? input.price : product.rate
            const amount = input.quantity * priceToUse

            const sessionProduct = await prisma.sessionProduct.create({
                data: {
                    dutySessionId: input.shiftId,
                    productId: input.productId,
                    quantity: new Prisma.Decimal(input.quantity),
                    price: new Prisma.Decimal(priceToUse),
                    amount: new Prisma.Decimal(amount),
                },
                include: { product: true }
            })

            return sessionProduct
        }),

    /**
     * Admin: Update product sale
     */
    adminUpdateProductSale: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            id: z.number(),
            productId: z.number().optional(),
            quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
            price: z.number().min(0).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift || shift.stationId !== ctx.stationId) throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = shift.userId === ctx.user.id
            const isRejected = shift.status === 'rejected'

            if (!isAdmin && !(isOwner && isRejected)) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to edit this shift' })
            }

            if (shift.status === 'verified') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot edit a verified shift' })
            }

            const existing = await prisma.sessionProduct.findUnique({
                where: { id: input.id },
                include: { product: true }
            })
            if (!existing || existing.dutySessionId !== input.shiftId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Product sale record not found' })
            }

            const productIdToUse = input.productId || existing.productId
            const product = await prisma.product.findFirst({
                where: { id: productIdToUse, stationId: ctx.stationId, deletedAt: null }
            })
            if (!product) throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' })

            const priceToUse = input.price !== undefined ? input.price : (input.productId && input.productId !== existing.productId ? product.rate : Number(existing.price))
            const amount = input.quantity * priceToUse

            return prisma.sessionProduct.update({
                where: { id: input.id },
                data: {
                    productId: productIdToUse,
                    quantity: new Prisma.Decimal(input.quantity),
                    price: new Prisma.Decimal(priceToUse),
                    amount: new Prisma.Decimal(amount),
                },
                include: { product: true }
            })
        }),

    /**
     * Admin: Delete product sale
     */
    adminDeleteProductSale: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
            id: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({ where: { id: input.shiftId } })
            if (!shift || shift.stationId !== ctx.stationId) throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = shift.userId === ctx.user.id
            const isRejected = shift.status === 'rejected'

            if (!isAdmin && !(isOwner && isRejected)) {
                throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not have permission to edit this shift' })
            }

            if (shift.status === 'verified') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot edit a verified shift' })
            }

            const existing = await prisma.sessionProduct.findUnique({
                where: { id: input.id }
            })
            if (!existing || existing.dutySessionId !== input.shiftId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Product sale record not found' })
            }

            await prisma.sessionProduct.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),

    /**
     * Get all active (in_progress) shifts for admin dashboard
     */
    getActiveShifts: adminProcedure
        .query(async ({ ctx }) => {
            const shifts = await prisma.dutySession.findMany({
                where: { stationId: ctx.stationId, status: 'in_progress' },
                include: {
                    user: { select: { id: true, name: true, username: true } },
                    nozzleReadings: {
                        include: {
                            nozzle: {
                                include: { fuel: true, dispenser: true }
                            }
                        }
                    },
                },
                orderBy: { startTime: 'desc' },
            })

            return shifts.map(shift => ({
                id: shift.id,
                user: shift.user,
                type: shift.type,
                startTime: shift.startTime,
                nozzles: shift.nozzleReadings.map(nr => ({
                    code: nr.nozzle.code,
                    dispenserCode: nr.nozzle.dispenser.code,
                    fuelName: nr.nozzle.fuel.name,
                })),
                nozzleCount: shift.nozzleReadings.length,
            }))
        }),

    /**
     * Get recent completed/verified/rejected shifts for activity feed
     */
    getRecentCompleted: adminProcedure
        .input(z.object({
            limit: z.number().min(1).max(20).default(10),
        }))
        .query(async ({ ctx, input }) => {
            const shifts = await prisma.dutySession.findMany({
                where: {
                    stationId: ctx.stationId,
                    status: { in: ['pending_verification', 'verified', 'rejected'] }
                },
                include: {
                    user: { select: { id: true, name: true, username: true } },
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true } } }
                    },
                },
                orderBy: { endTime: 'desc' },
                take: input.limit,
            })

            return shifts.map(shift => {
                // Calculate total fuel sales
                let totalFuelSales = 0
                for (const reading of shift.nozzleReadings) {
                    const qty = Number(reading.fuelDispensed || 0)
                    const price = Number((reading as any).fuelPrice && Number((reading as any).fuelPrice) > 0 ? (reading as any).fuelPrice : reading.nozzle.price)
                    totalFuelSales += qty * price
                }

                return {
                    id: shift.id,
                    user: shift.user,
                    type: shift.type,
                    status: shift.status,
                    endTime: shift.endTime,
                    totalCollected: Number(shift.totalPaymentCollected),
                    totalFuelSales: Math.round(totalFuelSales * 100) / 100,
                }
            })
        }),

    /**
     * Get dashboard statistics counts
     */
    getDashboardStats: adminProcedure
        .query(async ({ ctx }) => {
            const [activeCount, pendingCount] = await Promise.all([
                prisma.dutySession.count({ where: { stationId: ctx.stationId, status: 'in_progress' } }),
                prisma.dutySession.count({ where: { stationId: ctx.stationId, status: 'pending_verification' } }),
            ])

            return {
                activeShifts: activeCount,
                pendingVerifications: pendingCount,
            }
        }),
    /**
     * Delete shift (admin only)
     * Only 'in_progress' or 'pending_verification' shifts can be deleted.
     */
    delete: adminProcedure
        .input(z.object({
            shiftId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
                include: { nozzleReadings: true }
            })

            if (!shift) {
                throw new Error('Shift not found')
            }

            // Validation: Only allow deleting in_progress or pending_verification
            if (shift.status !== 'in_progress' && shift.status !== 'pending_verification') {
                throw new Error(`Cannot delete shift with status '${shift.status}'. Only in-progress or pending verification shifts can be deleted.`)
            }

            // If shift is in_progress, release the nozzles
            if (shift.status === 'in_progress') {
                const nozzleIds = shift.nozzleReadings.map(r => r.nozzleId)
                if (nozzleIds.length > 0) {
                    await prisma.nozzle.updateMany({
                        where: { id: { in: nozzleIds } },
                        data: { isAvailable: true }
                    })
                }
            }

            await prisma.dutySession.delete({
                where: { id: input.shiftId }
            })

            return { success: true }
        }),
})
