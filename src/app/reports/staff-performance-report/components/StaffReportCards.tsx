"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDown, ChevronUp, Calendar01Icon, Time01Icon } from "@hugeicons/core-free-icons"
import { FuelBreakdownCard } from "./FuelBreakdownCard"

interface Shift {
    id: number
    type: string
    startTime: Date
    endTime: Date | null
    status: string
    dutyHours: number
    totalFuelSales: number
    totalPaymentsCollected: number
    difference: number
    isShort: boolean
    isExcess: boolean
    fuelBreakdown: Array<{
        fuelName: string
        quantityInLiters: number
        amount: number
    }>
}

interface StaffData {
    userId: number
    userName: string
    shifts: Shift[]
    totals: {
        totalDutyHours: number
        totalFuelSales: number
        totalPaymentsCollected: number
        totalDifference: number
    }
}

interface StaffReportCardsProps {
    staff: StaffData[]
}

export function StaffReportCards({ staff }: StaffReportCardsProps) {
    const [expandedStaff, setExpandedStaff] = useState<Set<number>>(new Set())
    const [expandedShifts, setExpandedShifts] = useState<Set<number>>(new Set())

    const toggleStaff = (userId: number) => {
        const newExpanded = new Set(expandedStaff)
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId)
        } else {
            newExpanded.add(userId)
        }
        setExpandedStaff(newExpanded)
    }

    const toggleShift = (shiftId: number) => {
        const newExpanded = new Set(expandedShifts)
        if (newExpanded.has(shiftId)) {
            newExpanded.delete(shiftId)
        } else {
            newExpanded.add(shiftId)
        }
        setExpandedShifts(newExpanded)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount)
    }

    const getShiftTypeLabel = (type: string) => {
        return type.charAt(0) + type.slice(1).toLowerCase()
    }

    if (staff.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                No staff data found for the selected criteria.
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {staff.map((staffMember) => (
                <Card key={staffMember.userId}>
                    <CardContent className="p-4">
                        {/* Staff Header */}
                        <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleStaff(staffMember.userId)}
                        >
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">{staffMember.userName}</h3>
                                <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                                    <span>{staffMember.shifts.length} shifts</span>
                                    <span>•</span>
                                    <span>{staffMember.totals.totalDutyHours.toFixed(1)}h duty</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right mr-2">
                                    <div className="text-sm font-medium">
                                        {formatCurrency(staffMember.totals.totalDifference)}
                                    </div>
                                </div>
                                <HugeiconsIcon
                                    icon={expandedStaff.has(staffMember.userId) ? ChevronUp : ChevronDown}
                                    className="h-5 w-5 text-muted-foreground"
                                />
                            </div>
                        </div>

                        {/* Expanded Staff Details */}
                        {expandedStaff.has(staffMember.userId) && (
                            <div className="mt-4 space-y-3 border-t pt-4">
                                {/* Staff Totals */}
                                <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                                    <div>
                                        <div className="text-muted-foreground text-xs">Total Fuel Sales</div>
                                        <div className="font-medium">{formatCurrency(staffMember.totals.totalFuelSales)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-xs">Total Payments</div>
                                        <div className="font-medium">{formatCurrency(staffMember.totals.totalPaymentsCollected)}</div>
                                    </div>
                                </div>

                                {/* Individual Shifts */}
                                {staffMember.shifts.map((shift) => (
                                    <Card key={shift.id} className="border-l-4" style={{
                                        borderLeftColor: shift.isShort ? 'rgb(239, 68, 68)' :
                                            shift.isExcess ? 'rgb(22, 163, 74)' :
                                                'rgb(156, 163, 175)'
                                    }}>
                                        <CardContent className="p-3">
                                            <div
                                                className="flex items-start justify-between cursor-pointer"
                                                onClick={() => toggleShift(shift.id)}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="text-xs">
                                                            {getShiftTypeLabel(shift.type)}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <HugeiconsIcon icon={Calendar01Icon} className="h-3 w-3" />
                                                        <span>{format(new Date(shift.startTime), "dd MMM yyyy")}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                        <HugeiconsIcon icon={Time01Icon} className="h-3 w-3" />
                                                        <span>{shift.dutyHours.toFixed(1)} hours</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm font-semibold ${shift.isShort ? 'text-destructive' :
                                                        shift.isExcess ? 'text-green-600' : ''
                                                        }`}>
                                                        {shift.difference >= 0 ? '+' : ''}{formatCurrency(shift.difference)}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        difference
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Shift Details */}
                                            {expandedShifts.has(shift.id) && (
                                                <div className="mt-3 pt-3 border-t space-y-2">
                                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <span className="text-muted-foreground">Fuel Sales:</span>
                                                            <span className="ml-1 font-medium">{formatCurrency(shift.totalFuelSales)}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Payments:</span>
                                                            <span className="ml-1 font-medium">{formatCurrency(shift.totalPaymentsCollected)}</span>
                                                        </div>
                                                    </div>
                                                    <FuelBreakdownCard fuelBreakdown={shift.fuelBreakdown} />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
