"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, FilterIcon } from "@hugeicons/core-free-icons"
import { StaffReportFilters } from "./components/StaffReportFilters"
import { StaffReportTable } from "./components/StaffReportTable"
import { StaffReportCards } from "./components/StaffReportCards"
import { FuelBreakdownSummary } from "./components/FuelBreakdownSummary"
import { ShiftType } from "@prisma/client"

export default function StaffReportPage() {
    const router = useRouter()
    const { user } = useAuth()
    const isAdmin = user?.role === 'Admin' || user?.role === 'Manager'

    const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
    const [toDate, setToDate] = useState<Date | undefined>(new Date())
    const [shiftType, setShiftType] = useState<string>("all")
    const [userId, setUserId] = useState<string>("all")
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Fetch users for filter (admin only)
    const usersQuery = trpc.user.getAll.useQuery(
        { role: 'Fuel Attendant' },
        { enabled: isAdmin }
    )

    // Fetch staff report data
    const reportQuery = trpc.staff.getStaffReport.useQuery({
        startDate: fromDate,
        endDate: toDate,
        shiftType: shiftType !== "all" ? (shiftType as ShiftType) : undefined,
        userId: userId !== "all" ? parseInt(userId) : undefined,
    })

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount)
    }

    // Check if any filter is active
    const activeFilterCount = [
        fromDate,
        toDate,
        shiftType !== "all",
        userId !== "all"
    ].filter(Boolean).length

    return (
        <div className="container mx-auto py-8 space-y-4 px-4">
            {/* Header with Filter Toggle */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight">Staff Performance</h2>
                    </div>

                    {/* Mobile Filter Toggle */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className="md:hidden relative"
                    >
                        <HugeiconsIcon icon={FilterIcon} className="h-5 w-5" />
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px] bg-primary text-primary-foreground border-2 border-background">
                                {activeFilterCount}
                            </Badge>
                        )}
                    </Button>
                </div>

                {/* Desktop Filters (Always Visible) */}
                <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2 md:flex-shrink-0">
                    <StaffReportFilters
                        fromDate={fromDate}
                        setFromDate={setFromDate}
                        toDate={toDate}
                        setToDate={setToDate}
                        shiftType={shiftType}
                        setShiftType={setShiftType}
                        userId={userId}
                        setUserId={setUserId}
                        users={usersQuery.data || []}
                        className="flex items-center gap-2 flex-wrap"
                    />
                </div>
            </div>

            {/* Mobile Filters (Collapsible) */}
            {isFilterOpen && (
                <Card className="md:hidden">
                    <CardContent className="p-4">
                        <StaffReportFilters
                            fromDate={fromDate}
                            setFromDate={setFromDate}
                            toDate={toDate}
                            setToDate={setToDate}
                            shiftType={shiftType}
                            setShiftType={setShiftType}
                            userId={userId}
                            setUserId={setUserId}
                            users={usersQuery.data || []}
                            className="flex flex-col gap-4"
                        />
                    </CardContent>
                </Card>
            )}

            {/* Summary Cards */}
            {reportQuery.data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Total Shifts</div>
                            <div className="text-2xl font-bold">{reportQuery.data.summary.totalShifts}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Total Duty Hours</div>
                            <div className="text-2xl font-bold">{reportQuery.data.summary.overallDutyHours.toFixed(1)}h</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-sm text-muted-foreground">Overall Difference</div>
                            <div className={`text-2xl font-bold ${reportQuery.data.summary.overallDifference < 0 ? 'text-destructive' :
                                reportQuery.data.summary.overallDifference > 0 ? 'text-green-600' : ''
                                }`}>
                                {reportQuery.data.summary.overallDifference > 0 ? '+' : ''}
                                {formatCurrency(reportQuery.data.summary.overallDifference)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Fuel Breakdown Summary */}
            {reportQuery.data && reportQuery.data.summary.fuelBreakdown && (
                <FuelBreakdownSummary fuelBreakdown={reportQuery.data.summary.fuelBreakdown} />
            )}

            {/* Report Content */}
            {reportQuery.isLoading ? (
                <div className="text-center py-12">
                    <Spinner className="size-8 mx-auto" />
                </div>
            ) : reportQuery.error ? (
                <Card>
                    <CardContent className="p-6 text-center text-destructive">
                        Error loading report: {reportQuery.error.message}
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <Card className="hidden md:block">
                        <CardContent className="p-0">
                            <StaffReportTable staff={reportQuery.data?.staff || []} />
                        </CardContent>
                    </Card>

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        <StaffReportCards staff={reportQuery.data?.staff || []} />
                    </div>
                </>
            )}
        </div>
    )
}
