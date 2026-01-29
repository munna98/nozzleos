"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { trpc } from "@/lib/trpc"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons"

export function PendingVerificationsPanel() {
    const router = useRouter()
    const { data: pendingData, isLoading } = trpc.shift.getPendingVerification.useQuery(
        { limit: 5 },
        { refetchInterval: 60000 } // Auto-refresh every minute
    )

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        Pending Verifications
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <HugeiconsIcon icon={Loading02Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    const pendingCount = pendingData?.pagination.total || 0
    const sessions = pendingData?.sessions || []

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="h-2 w-2 rounded-full bg-yellow-500" />
                        Pending Verifications
                        {pendingCount > 0 && (
                            <Badge variant="destructive" className="ml-2">{pendingCount}</Badge>
                        )}
                    </CardTitle>
                    {pendingCount > 5 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => router.push('/reports/shift-history?status=pending_verification')}
                        >
                            See all
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {sessions.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>All shifts verified!</p>
                    </div>
                ) : (
                    <>
                        {sessions.map((session) => {
                            // Calculate total sales
                            let totalSales = 0
                            for (const reading of session.nozzleReadings) {
                                const qty = Number(reading.fuelDispensed || 0)
                                const price = Number(reading.nozzle.price)
                                totalSales += qty * price
                            }

                            const difference = Number(session.totalPaymentCollected) - totalSales

                            return (
                                <div
                                    key={session.id}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/reports/shift-history/${session.id}?source=dashboard`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <div className="font-medium text-sm">
                                                {session.user.name || session.user.username}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <span>{session.type}</span>
                                                <span>•</span>
                                                <span className={difference < 0 ? "text-red-500 font-bold" : difference > 0 ? "text-green-500 font-bold" : ""}>
                                                    {difference > 0 ? "+" : difference < 0 ? "-" : ""}₹{Math.abs(Math.round(difference)).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {session.endTime && formatDistanceToNow(new Date(session.endTime), { addSuffix: true })}
                                        </span>
                                        <Button variant="outline" size="sm">
                                            Review
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}

                    </>
                )}
            </CardContent>
        </Card>
    )
}
