import { z } from 'zod'
import { ShiftType } from '@prisma/client'
import { router, tenantProcedure, adminProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'

export const staffRouter = router({
    /**
     * Get staff performance report with shift-wise analytics (tenant-scoped)
     */
    getStaffReport: tenantProcedure
        .input(z.object({
            startDate: z.date().optional(),
            endDate: z.date().optional(),
            userId: z.number().optional(),
            shiftType: z.nativeEnum(ShiftType).optional(),
        }))
        .query(async ({ ctx, input }) => {
            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'

            // Build where clause with stationId
            const where: Record<string, unknown> = {
                stationId: ctx.stationId
            }

            // Date range filter
            if (input.startDate || input.endDate) {
                where.startTime = {}
                if (input.startDate) {
                    const start = new Date(input.startDate);
                    (where.startTime as Record<string, unknown>).gte = start
                }
                if (input.endDate) {
                    const end = new Date(input.endDate)
                    end.setDate(end.getDate() + 1);
                    (where.startTime as Record<string, unknown>).lt = end
                }
            }

            // Shift type filter
            if (input.shiftType) {
                where.type = input.shiftType
            }

            // User filter
            if (input.userId) {
                if (isAdmin) {
                    where.userId = input.userId
                }
            } else if (!isAdmin) {
                // Non-admin can only see their own data
                where.userId = ctx.user.id
            }

            // Only show completed shifts (not in_progress)
            where.status = {
                in: ['pending_verification', 'verified', 'rejected']
            }

            // Fetch shifts with all necessary relations
            const shifts = await prisma.dutySession.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                        }
                    },
                    nozzleReadings: {
                        include: {
                            nozzle: {
                                include: {
                                    fuel: true
                                }
                            }
                        }
                    },
                    sessionPayments: {
                        include: {
                            paymentMethod: true
                        }
                    }
                },
                orderBy: {
                    startTime: 'desc'
                }
            })

            // Group shifts by user
            const staffMap = new Map<number, {
                userId: number,
                userName: string,
                shifts: Array<{
                    id: number,
                    type: ShiftType,
                    startTime: Date,
                    endTime: Date | null,
                    status: string,
                    dutyHours: number,
                    totalFuelSales: number,
                    totalPaymentsCollected: number,
                    difference: number,
                    isShort: boolean,
                    isExcess: boolean,
                    fuelBreakdown: Array<{ fuelName: string, quantityInLiters: number, amount: number }>
                }>,
                totals: {
                    totalDutyHours: number,
                    totalFuelSales: number,
                    totalPaymentsCollected: number,
                    totalDifference: number,
                }
            }>()

            for (const shift of shifts) {
                const userId = shift.user.id

                if (!staffMap.has(userId)) {
                    staffMap.set(userId, {
                        userId: userId,
                        userName: shift.user.name || shift.user.username,
                        shifts: [],
                        totals: {
                            totalDutyHours: 0,
                            totalFuelSales: 0,
                            totalPaymentsCollected: 0,
                            totalDifference: 0,
                        }
                    })
                }

                const staffData = staffMap.get(userId)!

                // Calculate duty hours
                const dutyHours = shift.endTime
                    ? (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60)
                    : 0

                // Calculate fuel sales and breakdown
                let totalFuelSales = 0
                const fuelBreakdownMap = new Map<string, { fuelName: string, quantityInLiters: number, amount: number }>()

                for (const reading of shift.nozzleReadings) {
                    const qty = Number(reading.fuelDispensed || 0)
                    const price = Number(reading.nozzle.price)
                    const amount = qty * price
                    totalFuelSales += amount

                    const fuelName = reading.nozzle.fuel.name
                    if (fuelBreakdownMap.has(fuelName)) {
                        const existing = fuelBreakdownMap.get(fuelName)!
                        existing.quantityInLiters += qty
                        existing.amount += amount
                    } else {
                        fuelBreakdownMap.set(fuelName, {
                            fuelName,
                            quantityInLiters: qty,
                            amount
                        })
                    }
                }

                const fuelBreakdown = Array.from(fuelBreakdownMap.values())

                // Calculate payments
                const totalPaymentsCollected = Number(shift.totalPaymentCollected)

                // Calculate difference
                const difference = totalPaymentsCollected - totalFuelSales

                // Add shift data
                staffData.shifts.push({
                    id: shift.id,
                    type: shift.type,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    status: shift.status,
                    dutyHours: Math.round(dutyHours * 100) / 100,
                    totalFuelSales: Math.round(totalFuelSales * 100) / 100,
                    totalPaymentsCollected: Math.round(totalPaymentsCollected * 100) / 100,
                    difference: Math.round(difference * 100) / 100,
                    isShort: difference < 0,
                    isExcess: difference > 0,
                    fuelBreakdown: fuelBreakdown.map(fb => ({
                        ...fb,
                        quantityInLiters: Math.round(fb.quantityInLiters * 100) / 100,
                        amount: Math.round(fb.amount * 100) / 100
                    }))
                })

                // Update totals
                staffData.totals.totalDutyHours += dutyHours
                staffData.totals.totalFuelSales += totalFuelSales
                staffData.totals.totalPaymentsCollected += totalPaymentsCollected
                staffData.totals.totalDifference += difference
            }

            // Convert map to array and round totals
            const staffReport = Array.from(staffMap.values()).map(staff => ({
                ...staff,
                totals: {
                    totalDutyHours: Math.round(staff.totals.totalDutyHours * 100) / 100,
                    totalFuelSales: Math.round(staff.totals.totalFuelSales * 100) / 100,
                    totalPaymentsCollected: Math.round(staff.totals.totalPaymentsCollected * 100) / 100,
                    totalDifference: Math.round(staff.totals.totalDifference * 100) / 100,
                }
            }))

            // Calculate overall fuel breakdown
            const overallFuelBreakdownMap = new Map<string, { fuelName: string, quantityInLiters: number, amount: number }>()

            for (const staff of staffReport) {
                for (const shift of staff.shifts) {
                    for (const fuelItem of shift.fuelBreakdown) {
                        if (overallFuelBreakdownMap.has(fuelItem.fuelName)) {
                            const existing = overallFuelBreakdownMap.get(fuelItem.fuelName)!
                            existing.quantityInLiters += fuelItem.quantityInLiters
                            existing.amount += fuelItem.amount
                        } else {
                            overallFuelBreakdownMap.set(fuelItem.fuelName, {
                                fuelName: fuelItem.fuelName,
                                quantityInLiters: fuelItem.quantityInLiters,
                                amount: fuelItem.amount
                            })
                        }
                    }
                }
            }

            const overallFuelBreakdown = Array.from(overallFuelBreakdownMap.values()).map(fb => ({
                ...fb,
                quantityInLiters: Math.round(fb.quantityInLiters * 100) / 100,
                amount: Math.round(fb.amount * 100) / 100
            }))

            return {
                staff: staffReport,
                summary: {
                    totalStaff: staffReport.length,
                    totalShifts: shifts.length,
                    overallDutyHours: staffReport.reduce((sum, s) => sum + s.totals.totalDutyHours, 0),
                    overallFuelSales: staffReport.reduce((sum, s) => sum + s.totals.totalFuelSales, 0),
                    overallPaymentsCollected: staffReport.reduce((sum, s) => sum + s.totals.totalPaymentsCollected, 0),
                    overallDifference: staffReport.reduce((sum, s) => sum + s.totals.totalDifference, 0),
                    fuelBreakdown: overallFuelBreakdown,
                }
            }
        }),

    /**
     * Get staff performance chart data for dashboard (admin-only, tenant-scoped)
     */
    getPerformanceChartData: adminProcedure
        .input(z.object({
            days: z.number().min(1).max(90).default(7),
        }))
        .query(async ({ ctx, input }) => {
            // Calculate date range
            const endDate = new Date()
            const startDate = new Date()
            startDate.setDate(startDate.getDate() - input.days)
            startDate.setHours(0, 0, 0, 0)

            // Get all completed shifts in the period for this station
            const shifts = await prisma.dutySession.findMany({
                where: {
                    stationId: ctx.stationId,
                    status: { in: ['pending_verification', 'verified', 'rejected'] },
                    startTime: { gte: startDate, lte: endDate }
                },
                include: {
                    user: { select: { id: true, name: true, username: true } },
                    nozzleReadings: {
                        include: { nozzle: true }
                    }
                }
            })

            // Group by user and calculate totals
            const staffMap = new Map<number, {
                userId: number,
                name: string,
                totalDifference: number,
                shiftCount: number
            }>()

            for (const shift of shifts) {
                const userId = shift.user.id
                const userName = shift.user.name || shift.user.username

                // Calculate fuel sales
                let totalFuelSales = 0
                for (const reading of shift.nozzleReadings) {
                    const qty = Number(reading.fuelDispensed || 0)
                    const price = Number(reading.nozzle.price)
                    totalFuelSales += qty * price
                }

                const totalCollected = Number(shift.totalPaymentCollected)
                const difference = totalCollected - totalFuelSales

                if (!staffMap.has(userId)) {
                    staffMap.set(userId, {
                        userId,
                        name: userName,
                        totalDifference: 0,
                        shiftCount: 0
                    })
                }

                const data = staffMap.get(userId)!
                data.totalDifference += difference
                data.shiftCount += 1
            }

            // Convert to array and sort by difference (worst performers first - most shortage)
            const chartData = Array.from(staffMap.values())
                .map(staff => ({
                    ...staff,
                    totalDifference: Math.round(staff.totalDifference * 100) / 100,
                    isShortage: staff.totalDifference < 0,
                    isExcess: staff.totalDifference > 0,
                }))
                .sort((a, b) => a.totalDifference - b.totalDifference)

            return {
                chartData,
                period: {
                    startDate,
                    endDate,
                    days: input.days
                }
            }
        }),
})
