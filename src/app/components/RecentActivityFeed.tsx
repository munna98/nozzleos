"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { trpc } from "@/lib/trpc"
import { formatDistanceToNow } from "date-fns"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Clock01Icon,
    Tick02Icon,
    Cancel01Icon,
    Loading02Icon,
    MenuCircleIcon
} from "@hugeicons/core-free-icons"
import { Badge } from "@/components/ui/badge"

export function RecentActivityFeed() {
    const router = useRouter()
    const { data: shifts, isLoading } = trpc.shift.getRecentCompleted.useQuery(
        { limit: 10 },
        { refetchInterval: 60000 }
    )

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">📋 Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <HugeiconsIcon icon={Loading02Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'verified':
                return <HugeiconsIcon icon={Tick02Icon} className="h-3 w-3 text-green-500" />
            case 'rejected':
                return <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3 text-red-500" />
            case 'pending_verification':
                return <HugeiconsIcon icon={Clock01Icon} className="h-3 w-3 text-yellow-500" />
            default:
                return <HugeiconsIcon icon={MenuCircleIcon} className="h-3 w-3 text-gray-500" />
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'verified': return 'Verified shift'
            case 'rejected': return 'Rejected shift'
            case 'pending_verification': return 'Completed shift'
            default: return 'Shift update'
        }
    }

    return (
        <Card className="h-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <HugeiconsIcon icon={Clock01Icon} className="h-5 w-5 text-muted-foreground" />
                    Recent Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {shifts?.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <p>No recent activity</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {shifts?.map((shift) => (
                            <div
                                key={shift.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                                onClick={() => router.push(`/reports/shift-history/${shift.id}?source=dashboard`)}
                            >
                                <div>
                                    {getStatusIcon(shift.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors truncate">
                                            {shift.user.name || shift.user.username}
                                        </p>
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {shift.endTime && formatDistanceToNow(new Date(shift.endTime), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1.5">
                                        <p className="text-xs text-muted-foreground">
                                            {getStatusText(shift.status)} • <span className="font-mono">{shift.type}</span>
                                        </p>
                                        <span className="text-xs font-medium">
                                            ₹{Math.round(shift.totalCollected).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
