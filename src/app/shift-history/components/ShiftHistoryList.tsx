"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserCircleIcon, Calendar01Icon, TimeQuarterPassIcon } from "@hugeicons/core-free-icons"

import { inferRouterOutputs } from '@trpc/server'
import { AppRouter } from '@/server/trpc/router'

type RouterOutput = inferRouterOutputs<AppRouter>
type ShiftSession = RouterOutput['shift']['getAll']['sessions'][number]

interface ShiftHistoryListProps {
    shifts: ShiftSession[]
    isAdmin: boolean
    onViewShift: (shiftId: number) => void
}

export function ShiftHistoryList({ shifts, isAdmin, onViewShift }: ShiftHistoryListProps) {
    const formatDate = (dateStr: string | Date) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatTime = (dateStr: string | Date) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const calculateDuration = (start: string | Date, end: string | Date | null) => {
        if (!end) return '--'
        const startDate = new Date(start)
        const endDate = new Date(end)
        const diff = endDate.getTime() - startDate.getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h ${minutes}m`
    }

    const calculateTotalSales = (readings: ShiftSession['nozzleReadings']) => {
        return readings.reduce((total: number, reading) => {
            const dispensed = Number(reading.fuelDispensed?.toString() || 0)
            const price = Number(reading.nozzle.price)
            return total + (dispensed * price)
        }, 0)
    }

    return (
        <div className="space-y-4">
            {shifts.map((shift) => {
                const totalSales = calculateTotalSales(shift.nozzleReadings)
                const totalCollected = Number(shift.totalPaymentCollected)
                const shortage = totalCollected - totalSales

                return (
                    <Card
                        key={shift.id}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => onViewShift(shift.id)}
                    >
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                                {/* Header Row */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold text-base">{shift.shiftName}</h3>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            <HugeiconsIcon icon={Calendar01Icon} className="h-3.5 w-3.5" />
                                            <span>{formatDate(shift.startTime)}</span>
                                            <span className="text-muted-foreground/50">•</span>
                                            <span>
                                                {formatTime(shift.startTime)}
                                                {shift.endTime && ` - ${formatTime(shift.endTime)}`}
                                            </span>
                                        </div>
                                    </div>
                                    <Badge variant={shift.status === 'completed' ? 'default' : 'secondary'}>
                                        {shift.status}
                                    </Badge>
                                </div>

                                {/* Admin: Show User */}
                                {isAdmin && shift.user && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <HugeiconsIcon icon={UserCircleIcon} className="h-4 w-4" />
                                        <span>{shift.user.name || shift.user.username}</span>
                                    </div>
                                )}

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Duration</p>
                                        <p className="font-medium text-sm">
                                            {calculateDuration(shift.startTime, shift.endTime)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Fuel Sales</p>
                                        <p className="font-medium text-sm">₹{totalSales.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Shortage / Excess</p>
                                        <p className={`font-medium text-sm ${shortage > 0 ? 'text-green-600' : shortage < 0 ? 'text-red-600' : ''}`}>
                                            {shortage > 0 ? '+' : shortage < 0 ? '-' : ''}₹{Math.abs(shortage).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}
