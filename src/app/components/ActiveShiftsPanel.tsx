"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { trpc } from "@/lib/trpc"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { FuelStationIcon, RefreshIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { CreateShiftDialog } from "./CreateShiftDialog"

export function ActiveShiftsPanel() {
    const router = useRouter()
    const [isCreateOpen, setIsCreateOpen] = useState(false)
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
        <>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            Active Shifts
                            <Badge variant="secondary" className="ml-1">{activeCount}</Badge>
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                            <Button
                                size="sm"
                                className="h-8 text-xs gap-1"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
                                <span>Start Shift</span>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()} title="Refresh">
                                <HugeiconsIcon icon={RefreshIcon} className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {activeCount === 0 ? (
                        <div className="text-center py-6 text-muted-foreground space-y-3">
                            <HugeiconsIcon icon={FuelStationIcon} className="h-10 w-10 mx-auto opacity-50" />
                            <p className="text-sm">No active shifts at the moment</p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => setIsCreateOpen(true)}
                            >
                                <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
                                Start Shift
                            </Button>
                        </div>
                    ) : (
                        shifts?.map((shift) => (
                            <div
                                key={shift.id}
                                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1 min-w-0">
                                        <div className="font-medium truncate">
                                            {shift.user.name || shift.user.username}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                            <span className="font-medium">
                                                {shift.type}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                {formatDistanceToNow(new Date(shift.startTime), { addSuffix: false })} elapsed
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm flex-wrap mt-1">
                                            <HugeiconsIcon icon={FuelStationIcon} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            {shift.nozzles.map((n, idx) => (
                                                <Badge key={idx} variant="outline" className="text-xs">
                                                    {n.code}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => router.push(`/reports/shift-history/${shift.id}?source=admin-dashboard`)}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => router.push(`/reports/shift-history/${shift.id}/edit`)}
                                        >
                                            Manage
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            <CreateShiftDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
            />
        </>
    )
}
