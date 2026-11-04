"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    AlertCircleIcon,
    CheckmarkCircle02Icon,
    ArrowUp01Icon,
} from "@hugeicons/core-free-icons"
import { inferRouterOutputs } from "@trpc/server"
import { AppRouter } from "@/server/trpc/router"

type RouterOutput = inferRouterOutputs<AppRouter>
export type ShiftHistorySummary = RouterOutput["shift"]["getAll"]["summary"]
type ShiftSession = RouterOutput["shift"]["getAll"]["sessions"][number]

interface ShiftHistorySummaryCardProps {
    summary?: ShiftHistorySummary
    isLoading?: boolean
    error?: string
    fallbackSessions?: ShiftSession[]
}

export function ShiftHistorySummaryCard({
    summary,
    isLoading = false,
    error,
    fallbackSessions,
}: ShiftHistorySummaryCardProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(amount)
    }

    // Client-side fallback if summary object is not present yet but sessions are
    const computedFallback = useMemo(() => {
        if (!fallbackSessions || fallbackSessions.length === 0) return null
        let totalSales = 0
        let totalCollected = 0
        let shortageCount = 0
        let excessCount = 0
        let completedCount = 0

        for (const s of fallbackSessions) {
            if (s.status === "in_progress") continue
            completedCount++
            let shiftSales = 0
            for (const nr of s.nozzleReadings || []) {
                const qty = Number(nr.fuelDispensed || 0)
                const price = Number(
                    (nr as any).fuelPrice && Number((nr as any).fuelPrice) > 0
                        ? (nr as any).fuelPrice
                        : ((nr.nozzle as any)?.price ?? 0)
                )
                shiftSales += qty * price
            }
            const shiftColl = Number(s.totalPaymentCollected || 0)
            const diff = shiftColl - shiftSales
            totalSales += shiftSales
            totalCollected += shiftColl
            if (diff < -0.01) shortageCount++
            else if (diff > 0.01) excessCount++
        }
        const netDiff = totalCollected - totalSales
        return {
            totalShifts: fallbackSessions.length,
            completedShiftsCount: completedCount,
            totalFuelSales: Math.round(totalSales * 100) / 100,
            totalPaymentsCollected: Math.round(totalCollected * 100) / 100,
            netDifference: Math.round(netDiff * 100) / 100,
            totalShortage: 0,
            totalExcess: 0,
            shortageCount,
            excessCount,
            settledCount: completedCount - shortageCount - excessCount,
            statusCounts: { verified: 0, pending_verification: 0, rejected: 0, in_progress: 0, completed: 0 },
            targetUser: null,
        }
    }, [fallbackSessions])

    // Minimal skeleton loading state
    if (isLoading && !summary && !computedFallback) {
        return (
            <div className="h-16 w-full rounded-xl border border-border/50 bg-muted/40 animate-pulse flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted-foreground/15" />
                    <div className="space-y-1">
                        <div className="h-3 w-16 bg-muted-foreground/15 rounded" />
                        <div className="h-4 w-20 bg-muted-foreground/20 rounded" />
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-6">
                    <div className="h-4 w-20 bg-muted-foreground/15 rounded" />
                    <div className="h-4 w-20 bg-muted-foreground/15 rounded" />
                    <div className="h-4 w-12 bg-muted-foreground/15 rounded" />
                </div>
            </div>
        )
    }

    if (error && !summary && !computedFallback) {
        return null
    }

    const data = summary || computedFallback
    if (!data) return null

    const netDifference = data.netDifference
    const isShortage = netDifference < -0.01
    const isExcess = netDifference > 0.01

    return (
        <Card
            className={`border shadow-2xs overflow-hidden transition-all ${
                isShortage
                    ? "border-l-4 border-l-red-500 bg-red-500/[0.03] dark:bg-red-500/[0.05]"
                    : isExcess
                    ? "border-l-4 border-l-emerald-500 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.05]"
                    : "border-l-4 border-l-primary/60 bg-card"
            }`}
        >
            <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
                    {/* Shortage or Excess */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`p-2 rounded-lg shrink-0 ${
                                isShortage
                                    ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                    : isExcess
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-primary/10 text-primary"
                            }`}
                        >
                            <HugeiconsIcon
                                icon={
                                    isShortage
                                        ? AlertCircleIcon
                                        : isExcess
                                        ? ArrowUp01Icon
                                        : CheckmarkCircle02Icon
                                }
                                className="h-5 w-5"
                            />
                        </div>
                        <div className="min-w-0">
                            <span className="text-xs text-muted-foreground font-medium block">
                                {isShortage ? "Shortage" : isExcess ? "Excess" : "Balanced"}
                            </span>
                            <div
                                className={`text-xl sm:text-2xl font-bold tracking-tight ${
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
                    </div>

                    {/* Period Numbers */}
                    <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-6 border-border/50 shrink-0">
                        <div>
                            <span className="text-[11px] text-muted-foreground block">Fuel Sales</span>
                            <span className="text-sm font-semibold text-foreground">
                                {formatCurrency(data.totalFuelSales)}
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] text-muted-foreground block">Collected</span>
                            <span className="text-sm font-semibold text-foreground">
                                {formatCurrency(data.totalPaymentsCollected)}
                            </span>
                        </div>
                        <div>
                            <span className="text-[11px] text-muted-foreground block">Shifts</span>
                            <span className="text-sm font-semibold text-foreground">
                                {data.completedShiftsCount}{" "}
                                <span className="text-xs font-normal text-muted-foreground">
                                    {data.completedShiftsCount === 1 ? "shift" : "shifts"}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
