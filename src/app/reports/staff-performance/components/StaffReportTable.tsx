"use client"

import * as React from "react"
import { useState } from "react"
import { format } from "date-fns"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDown, ChevronRight } from "@hugeicons/core-free-icons"
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

interface StaffReportTableProps {
    staff: StaffData[]
}

export function StaffReportTable({ staff }: StaffReportTableProps) {
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

    // Calculate overall totals
    const overallTotals = staff.reduce((acc, staffMember) => ({
        dutyHours: acc.dutyHours + staffMember.totals.totalDutyHours,
        fuelSales: acc.fuelSales + staffMember.totals.totalFuelSales,
        payments: acc.payments + staffMember.totals.totalPaymentsCollected,
        difference: acc.difference + staffMember.totals.totalDifference,
    }), { dutyHours: 0, fuelSales: 0, payments: 0, difference: 0 })

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Staff Name</TableHead>
                    <TableHead className="text-right">Total Shifts</TableHead>
                    <TableHead className="text-right">Duty Hours</TableHead>
                    <TableHead className="text-right">Fuel Sales</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {staff.map((staffMember) => (
                    <React.Fragment key={staffMember.userId}>
                        {/* Staff Summary Row */}
                        <TableRow
                            className="hover:bg-muted/50 cursor-pointer font-medium"
                            onClick={() => toggleStaff(staffMember.userId)}
                        >
                            <TableCell>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                >
                                    <HugeiconsIcon
                                        icon={expandedStaff.has(staffMember.userId) ? ChevronDown : ChevronRight}
                                        className="h-4 w-4"
                                    />
                                </Button>
                            </TableCell>
                            <TableCell className="font-semibold">
                                {staffMember.userName}
                            </TableCell>
                            <TableCell className="text-right">
                                {staffMember.shifts.length}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                                {staffMember.totals.totalDutyHours.toFixed(1)}h
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(staffMember.totals.totalFuelSales)}
                            </TableCell>
                            <TableCell className="text-right">
                                {formatCurrency(staffMember.totals.totalPaymentsCollected)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${staffMember.totals.totalDifference < 0 ? 'text-destructive' :
                                staffMember.totals.totalDifference > 0 ? 'text-green-600' : ''
                                }`}>
                                {staffMember.totals.totalDifference >= 0 ? '+' : ''}
                                {formatCurrency(staffMember.totals.totalDifference)}
                            </TableCell>
                        </TableRow>

                        {/* Expanded Shifts Details */}
                        {expandedStaff.has(staffMember.userId) && (
                            <TableRow>
                                <TableCell colSpan={7} className="bg-muted/20 p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b">
                                                <TableHead className="w-[50px] pl-12"></TableHead>
                                                <TableHead>Shift Type</TableHead>
                                                <TableHead>Date & Time</TableHead>
                                                <TableHead className="text-right">Duty Hours</TableHead>
                                                <TableHead className="text-right">Fuel Sales</TableHead>
                                                <TableHead className="text-right">Payments</TableHead>
                                                <TableHead className="text-right">Difference</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {staffMember.shifts.map((shift) => (
                                                <React.Fragment key={shift.id}>
                                                    <TableRow className="hover:bg-muted/30">
                                                        <TableCell className="pl-12">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    toggleShift(shift.id)
                                                                }}
                                                            >
                                                                <HugeiconsIcon
                                                                    icon={expandedShifts.has(shift.id) ? ChevronDown : ChevronRight}
                                                                    className="h-4 w-4"
                                                                />
                                                            </Button>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {getShiftTypeLabel(shift.type)}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">
                                                                    {format(new Date(shift.startTime), "dd MMM yyyy")}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {format(new Date(shift.startTime), "hh:mm a")}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-sm">
                                                            {shift.dutyHours.toFixed(1)}h
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm">
                                                            {formatCurrency(shift.totalFuelSales)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm">
                                                            {formatCurrency(shift.totalPaymentsCollected)}
                                                        </TableCell>
                                                        <TableCell className={`text-right font-semibold text-sm ${shift.isShort ? 'text-destructive' :
                                                            shift.isExcess ? 'text-green-600' : ''
                                                            }`}>
                                                            {shift.difference >= 0 ? '+' : ''}{formatCurrency(shift.difference)}
                                                        </TableCell>
                                                    </TableRow>
                                                    {/* Fuel Breakdown for individual shift */}
                                                    {expandedShifts.has(shift.id) && (
                                                        <TableRow>
                                                            <TableCell colSpan={7} className="bg-muted/40 p-4 pl-16">
                                                                <FuelBreakdownCard fuelBreakdown={shift.fuelBreakdown} />
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableCell>
                            </TableRow>
                        )}
                    </React.Fragment>
                ))}
            </TableBody>
            <TableFooter>
                <TableRow className="font-bold">
                    <TableCell colSpan={3} className="text-right">
                        Overall Total
                    </TableCell>
                    <TableCell className="text-right">
                        {overallTotals.dutyHours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right">
                        {formatCurrency(overallTotals.fuelSales)}
                    </TableCell>
                    <TableCell className="text-right">
                        {formatCurrency(overallTotals.payments)}
                    </TableCell>
                    <TableCell className={`text-right ${overallTotals.difference < 0 ? 'text-destructive' :
                        overallTotals.difference > 0 ? 'text-green-600' : ''
                        }`}>
                        {overallTotals.difference >= 0 ? '+' : ''}
                        {formatCurrency(overallTotals.difference)}
                    </TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    )
}
