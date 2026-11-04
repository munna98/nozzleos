"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    FuelStationIcon,
    Wallet01Icon,
    AlertCircleIcon,
    CheckmarkCircle02Icon,
    Coins01Icon,
    Calendar01Icon,
    UserCircleIcon,
    ArrowUp01Icon,
    ArrowDown01Icon,
} from "@hugeicons/core-free-icons"
import { inferRouterOutputs } from "@trpc/server"
import { AppRouter } from "@/server/trpc/router"
import { ShiftFiltersState } from "./ShiftFilters"

type RouterOutput = inferRouterOutputs<AppRouter>
export type ShiftHistorySummary = RouterOutput["shift"]["getAll"]["summary"]

interface ShiftHistorySummaryCardProps {
    summary?: ShiftHistorySummary
    isLoading?: boolean
    filters: ShiftFiltersState
    isAdmin: boolean
    currentUserName?: string
    onClearFilters?: () => void
}

export function ShiftHistorySummaryCard({
    summary,
    isLoading = false,
    filters,
    isAdmin,
    currentUserName,
    onClearFilters,
}: ShiftHistorySummaryCardProps) {
    const [viewMode, setViewMode] = useState<"period" | "allTime">("period")

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(amount)
    }

    const getPeriodLabel = () => {
        if (filters.datePreset === "today") return "Today"
        if (filters.datePreset === "yesterday") return "Yesterday"
        if (filters.datePreset === "this_week") return "This Week"
        if (filters.datePreset === "this_month") return "This Month"
        if (filters.datePreset === "last_month") return "Last Month"
        if (filters.startDateFrom || filters.startDateTo) {
            const from = filters.startDateFrom
                ? new Date(filters.startDateFrom).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                  })
                : "Start"
            const to = filters.startDateTo
                ? new Date(filters.startDateTo).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                  })
                : "End"
            return `${from} - ${to}`
        }
        return "All Time"
    }

    if (isLoading) {
        return (
            <Card className="border shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                        <Spinner className="size-5" />
                        <span>Calculating cumulative shift summary...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!summary) return null

    // Determine whether all-time data is available and differs from current period
    const hasActiveFilters = !!(
        filters.datePreset ||
        filters.startDateFrom ||
        filters.startDateTo ||
        filters.status ||
        filters.shiftType ||
        filters.userNameSearch
    )

    const hasAllTimeToggle = hasActiveFilters && !!summary.allTime

    const activeData = viewMode === "allTime" && summary.allTime ? summary.allTime : summary
    const netDifference = activeData.netDifference
    const isShortage = netDifference < -0.01
    const isExcess = netDifference > 0.01
    const isBalanced = !isShortage && !isExcess

    // Determine title / target user
    const targetUser = activeData.targetUser
    let subjectTitle = "My Shifts"
    if (targetUser) {
        subjectTitle = targetUser.name || targetUser.username
    } else if (isAdmin) {
        subjectTitle = "All Station Attendants"
    } else if (currentUserName) {
        subjectTitle = currentUserName
    }

    return (
        <Card
            className={`border shadow-sm overflow-hidden transition-all ${
                isShortage
                    ? "border-l-4 border-l-red-500 bg-red-500/[0.02] dark:bg-red-500/[0.04]"
                    : isExcess
                    ? "border-l-4 border-l-emerald-500 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04]"
                    : "border-l-4 border-l-primary/60 bg-card"
            }`}
        >
            <CardContent className="p-4 sm:p-6 space-y-5">
                {/* Header row: Context, Target Staff & Period / All-Time Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <HugeiconsIcon icon={UserCircleIcon} className="h-4 w-4 text-primary" />
                            <span>{subjectTitle}</span>
                        </div>
                        <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <HugeiconsIcon icon={Calendar01Icon} className="h-3.5 w-3.5" />
                            <span>
                                {viewMode === "allTime"
                                    ? "All-Time Cumulative"
                                    : `Period: ${getPeriodLabel()}`}
                            </span>
                        </div>
                        {activeData.totalShifts > 0 && (
                            <Badge variant="outline" className="text-[11px] font-normal px-2 py-0">
                                {activeData.totalShifts} shift{activeData.totalShifts !== 1 ? "s" : ""}
                            </Badge>
                        )}
                    </div>

                    {/* View Mode Toggle when filters are active */}
                    {hasAllTimeToggle && (
                        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/40 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setViewMode("period")}
                                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                                    viewMode === "period"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {getPeriodLabel()}
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("allTime")}
                                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                                    viewMode === "allTime"
                                        ? "bg-background text-foreground shadow-xs"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                All-Time Balance
                            </button>
                        </div>
                    )}
                </div>

                {/* Primary Hero Section: Cumulative Shortage or Excess */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* Hero Highlight Card (5 cols on lg) */}
                    <div
                        className={`lg:col-span-5 rounded-xl p-4 sm:p-5 flex flex-col justify-between border ${
                            isShortage
                                ? "bg-red-500/10 border-red-200 dark:border-red-900/50 dark:bg-red-950/20"
                                : isExcess
                                ? "bg-emerald-500/10 border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                : "bg-muted/40 border-border/50"
                        }`}
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {viewMode === "allTime"
                                        ? "All-Time Cumulative Balance"
                                        : "Cumulative Shortage / Excess"}
                                </span>
                                {isShortage && (
                                    <Badge
                                        variant="destructive"
                                        className="gap-1 font-semibold text-xs px-2 py-0.5"
                                    >
                                        <HugeiconsIcon icon={ArrowDown01Icon} className="h-3 w-3" />
                                        Shortage
                                    </Badge>
                                )}
                                {isExcess && (
                                    <Badge
                                        variant="default"
                                        className="gap-1 font-semibold text-xs px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    >
                                        <HugeiconsIcon icon={ArrowUp01Icon} className="h-3 w-3" />
                                        Excess
                                    </Badge>
                                )}
                                {isBalanced && (
                                    <Badge
                                        variant="secondary"
                                        className="gap-1 text-xs px-2 py-0.5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    >
                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-3 w-3" />
                                        Balanced
                                    </Badge>
                                )}
                            </div>

                            <div className="pt-1">
                                <div
                                    className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                                        isShortage
                                            ? "text-red-600 dark:text-red-400"
                                            : isExcess
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-foreground"
                                    }`}
                                >
                                    {isShortage ? "-" : isExcess ? "+" : ""}
                                    {formatCurrency(Math.abs(netDifference))}
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                                {isShortage && (
                                    <>
                                        Total payment collected is{" "}
                                        <span className="font-semibold text-red-600 dark:text-red-400">
                                            {formatCurrency(Math.abs(netDifference))}
                                        </span>{" "}
                                        less than metered fuel sales across {activeData.completedShiftsCount} shift
                                        {activeData.completedShiftsCount !== 1 ? "s" : ""}.
                                    </>
                                )}
                                {isExcess && (
                                    <>
                                        Total payment collected has a surplus of{" "}
                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(netDifference)}
                                        </span>{" "}
                                        above metered fuel sales across {activeData.completedShiftsCount} shift
                                        {activeData.completedShiftsCount !== 1 ? "s" : ""}.
                                    </>
                                )}
                                {isBalanced && (
                                    <>
                                        All cash and digital collections match metered fuel sales exactly across{" "}
                                        {activeData.completedShiftsCount} shift
                                        {activeData.completedShiftsCount !== 1 ? "s" : ""}.
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Breakdown pills inside the hero card */}
                        <div className="pt-4 mt-3 border-t border-border/40 grid grid-cols-2 gap-2 text-xs">
                            <div className="flex flex-col">
                                <span className="text-muted-foreground text-[11px]">Shortage Shifts</span>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                    {activeData.shortageCount} shift{activeData.shortageCount !== 1 ? "s" : ""}{" "}
                                    ({formatCurrency(activeData.totalShortage)})
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground text-[11px]">Excess Shifts</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {activeData.excessCount} shift{activeData.excessCount !== 1 ? "s" : ""}{" "}
                                    ({formatCurrency(activeData.totalExcess)})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Supporting 4-Metric Grid (7 cols on lg) */}
                    <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                        {/* 1. Total Fuel Sales */}
                        <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wider">Fuel Sales</span>
                                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                    <HugeiconsIcon icon={FuelStationIcon} className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
                                    {formatCurrency(activeData.totalFuelSales)}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {activeData.completedShiftsCount} completed shift
                                    {activeData.completedShiftsCount !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>

                        {/* 2. Total Payments Collected */}
                        <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wider">Collected</span>
                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <HugeiconsIcon icon={Coins01Icon} className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
                                    {formatCurrency(activeData.totalPaymentsCollected)}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Cash, online & cards
                                </p>
                            </div>
                        </div>

                        {/* 3. Gross Shortages */}
                        <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-red-500/40 transition-colors">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wider">Gross Shortage</span>
                                <div className="p-1.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400">
                                    <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="text-lg sm:text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">
                                    {formatCurrency(activeData.totalShortage)}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {activeData.shortageCount} shift{activeData.shortageCount !== 1 ? "s" : ""} with shortage
                                </p>
                            </div>
                        </div>

                        {/* 4. Gross Excess */}
                        <div className="rounded-xl border border-border/60 bg-card p-3.5 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-emerald-500/40 transition-colors">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span className="text-xs font-medium uppercase tracking-wider">Gross Excess</span>
                                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <HugeiconsIcon icon={Wallet01Icon} className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-2">
                                <div className="text-lg sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(activeData.totalExcess)}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {activeData.excessCount} shift{activeData.excessCount !== 1 ? "s" : ""} with excess
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer status summary row */}
                <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-medium text-foreground">Shift Status:</span>
                        <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            {activeData.statusCounts.verified} Verified
                        </span>
                        {activeData.statusCounts.pending_verification > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></span>
                                {activeData.statusCounts.pending_verification} Pending Review
                            </span>
                        )}
                        {activeData.statusCounts.rejected > 0 && (
                            <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                {activeData.statusCounts.rejected} Rejected
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-primary/40"></span>
                            {activeData.settledCount} Fully Balanced
                        </span>
                    </div>

                    {hasActiveFilters && onClearFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearFilters}
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                        >
                            Reset filters
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
