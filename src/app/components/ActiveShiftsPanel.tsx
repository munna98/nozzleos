"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { trpc } from "@/lib/trpc"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { FuelStationIcon, RefreshIcon } from "@hugeicons/core-free-icons"

export function ActiveShiftsPanel() {
    const router = useRouter()
    const { data: shifts, isLoading, refetch } = trpc.shift.getActiveShifts.useQuery(undefined, {
        refetchInterval: 30000, // Auto-refresh every 30 seconds
    })

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        Active Shifts
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Spinner className="size-6" />
                </CardContent>
            </Card>
        )
    }

    const activeCount = shifts?.length || 0

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        Active Shifts
                        <Badge variant="secondary" className="ml-2">{activeCount}</Badge>
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
                        <HugeiconsIcon icon={RefreshIcon} className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {activeCount === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <HugeiconsIcon icon={FuelStationIcon} className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No active shifts at the moment</p>
                    </div>
                ) : (
                    shifts?.map((shift) => (
                        <div
                            key={shift.id}
                            className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="font-medium">
                                        {shift.user.name || shift.user.username}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Badge variant="outline" className="text-xs">
                                            {shift.type}
                                        </Badge>
                                        <span>•</span>
                                        <span>
                                            {formatDistanceToNow(new Date(shift.startTime), { addSuffix: false })} elapsed
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Nozzles: {shift.nozzles.map(n => n.code).join(', ')}
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/reports/shift-history/${shift.id}?source=dashboard`)}
                                >
                                    View
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}
