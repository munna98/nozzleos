"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, FuelStationIcon, MoneyReceive01Icon, PencilEdit01Icon, Calendar01Icon, UserCircleIcon } from "@hugeicons/core-free-icons"

import { inferRouterOutputs } from '@trpc/server'
import { AppRouter } from '@/server/trpc/router'

type RouterOutput = inferRouterOutputs<AppRouter>
type ShiftDetail = NonNullable<RouterOutput['shift']['getById']>

interface ShiftDetailProps {
    shift: ShiftDetail
    isAdmin: boolean
    onBack: () => void
    onEdit: () => void
}

export function ShiftDetailView({ shift, isAdmin, onBack, onEdit }: ShiftDetailProps) {
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

    const formatDateTime = (dateStr: string | Date) => {
        return `${formatDate(dateStr)} at ${formatTime(dateStr)}`
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {shift.type ? (shift.type.charAt(0) + shift.type.slice(1).toLowerCase() + ' Shift') : 'Shift'}
                            </h1>
                            <Badge variant={shift.status === 'completed' ? 'default' : 'secondary'}>
                                {shift.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                                <HugeiconsIcon icon={Calendar01Icon} className="h-3.5 w-3.5" />
                                {formatDateTime(shift.startTime)}
                            </span>
                            {shift.user && (
                                <span className="flex items-center gap-1">
                                    <HugeiconsIcon icon={UserCircleIcon} className="h-3.5 w-3.5" />
                                    {shift.user.name || shift.user.username}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {isAdmin && (
                    <Button onClick={onEdit}>
                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-2" />
                        Edit Shift
                    </Button>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-muted-foreground text-sm mb-1">Total Fuel Sales</p>
                        <p className="text-2xl font-bold">₹{shift.totalFuelSales.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-muted-foreground text-sm mb-1">Total Collected</p>
                        <p className="text-2xl font-bold">₹{shift.totalCollected.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-muted-foreground text-sm mb-1">Shortage / Excess</p>
                        <p className={`text-2xl font-bold ${shift.shortage > 0 ? 'text-green-600' : shift.shortage < 0 ? 'text-red-600' : ''}`}>
                            {shift.shortage > 0 ? '+' : shift.shortage < 0 ? '-' : ''}₹{Math.abs(shift.shortage).toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Nozzle-wise Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <HugeiconsIcon icon={FuelStationIcon} className="h-5 w-5" />
                        Fuel Sales Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-3 font-medium">Nozzle</th>
                                    <th className="text-left p-3 font-medium">Fuel</th>
                                    <th className="text-right p-3 font-medium">Opening</th>
                                    <th className="text-right p-3 font-medium">Closing</th>
                                    <th className="text-right p-3 font-medium">Qty (L)</th>
                                    <th className="text-right p-3 font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shift.nozzleReadings.map((reading: any) => (
                                    <tr key={reading.id} className="border-t">
                                        <td className="p-3">
                                            <Badge variant="outline">{reading.nozzle.code}</Badge>
                                        </td>
                                        <td className="p-3">{reading.nozzle.fuel.name}</td>
                                        <td className="p-3 text-right text-muted-foreground">
                                            {parseFloat(reading.openingReading?.toString() || '0').toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right text-muted-foreground">
                                            {reading.closingReading
                                                ? parseFloat(reading.closingReading.toString()).toFixed(2)
                                                : '--'}
                                        </td>
                                        <td className="p-3 text-right font-medium">
                                            {parseFloat(reading.fuelDispensed?.toString() || '0').toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right font-medium">
                                            ₹{reading.amount.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className="border-t bg-muted/30 font-medium">
                                    <td colSpan={5} className="p-3 text-right">Total Fuel Sales</td>
                                    <td className="p-3 text-right">₹{shift.totalFuelSales.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Payments Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <HugeiconsIcon icon={MoneyReceive01Icon} className="h-5 w-5" />
                        Payments Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left p-3 font-medium">Payment Method</th>
                                    <th className="text-right p-3 font-medium">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shift.sessionPayments.length === 0 ? (
                                    <tr className="border-t">
                                        <td colSpan={2} className="p-3 text-center text-muted-foreground">
                                            No payments recorded
                                        </td>
                                    </tr>
                                ) : (
                                    shift.sessionPayments.map((payment: any) => (
                                        <tr key={payment.id} className="border-t">
                                            <td className="p-3">{payment.paymentMethod.name}</td>
                                            <td className="p-3 text-right font-medium">
                                                ₹{parseFloat(payment.amount.toString()).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                                <tr className="border-t bg-muted/30 font-medium">
                                    <td className="p-3 text-right">Total Collected</td>
                                    <td className="p-3 text-right">₹{shift.totalCollected.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Notes */}
            {shift.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Closing Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{shift.notes}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
