"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { FuelStationIcon, TimeQuarterPassIcon, PlayIcon } from "@hugeicons/core-free-icons"
import { useAuth } from "@/lib/auth-context"
import { trpc } from "@/lib/trpc"

export default function DashboardPage() {
    const router = useRouter()
    const { user } = useAuth()

    const activeShiftQuery = trpc.shift.getActive.useQuery(undefined, {
        retry: false
    })

    const shiftSummaryQuery = trpc.shift.getHistorySummary.useQuery({}, {
        retry: false
    })

    const hasActiveShift = !!activeShiftQuery.data
    const netDiff = shiftSummaryQuery.data?.netDifference ?? 0
    const isShortage = netDiff < -0.01
    const isExcess = netDiff > 0.01

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome{user?.name ? `, ${user.name}` : ''}
                </h1>
                <p className="text-muted-foreground mt-1">
                    What would you like to do today?
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
                {/* Start/Continue Shift */}
                <Card className="cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => router.push('/shift')}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <HugeiconsIcon icon={hasActiveShift ? PlayIcon : FuelStationIcon} className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">
                                    {hasActiveShift ? "Continue Active Shift" : "Start New Shift"}
                                </CardTitle>
                                <CardDescription>
                                    {hasActiveShift ? "Resume your current duty session" : "Begin a new duty shift"}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" size="lg">
                            {hasActiveShift ? "Continue Shift" : "Start Shift"}
                        </Button>
                    </CardContent>
                </Card>

                {/* View Shift History */}
                <Card className="cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => router.push('/reports/shift-history')}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <HugeiconsIcon icon={TimeQuarterPassIcon} className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Shift History</CardTitle>
                                <CardDescription>View past shift records</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {shiftSummaryQuery.data && shiftSummaryQuery.data.totalShifts > 0 && (
                            <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/60 border border-border/40">
                                <span className="text-muted-foreground">Cumulative Balance:</span>
                                <span className={`font-semibold ${
                                    isShortage
                                        ? 'text-red-600 dark:text-red-400'
                                        : isExcess
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-foreground'
                                }`}>
                                    {isShortage
                                        ? `Shortage: -₹${Math.abs(netDiff).toFixed(2)}`
                                        : isExcess
                                        ? `Excess: +₹${netDiff.toFixed(2)}`
                                        : 'Balanced (₹0.00)'}
                                </span>
                            </div>
                        )}
                        <Button variant="outline" className="w-full" size="lg">
                            View History
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
