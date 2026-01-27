"use client"

import { useState, Fragment } from "react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, FuelStationIcon, MoneyReceive01Icon, PencilEdit01Icon, Calendar01Icon, UserCircleIcon, CheckmarkCircle02Icon, Cancel01Icon, InformationCircleIcon, RefreshIcon } from "@hugeicons/core-free-icons"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"

import { inferRouterOutputs } from '@trpc/server'
import { AppRouter } from '@/server/trpc/router'

type RouterOutput = inferRouterOutputs<AppRouter>
type ShiftDetail = NonNullable<RouterOutput['shift']['getById']>

interface ShiftDetailProps {
    shift: ShiftDetail
    isAdmin: boolean
    onBack: () => void
    onEdit: () => void
    onVerifySuccess?: () => void
}

export function ShiftDetailView({ shift, isAdmin, onBack, onEdit, onVerifySuccess }: ShiftDetailProps) {
    const [isRejecting, setIsRejecting] = useState(false)
    const [rejectionNotes, setRejectionNotes] = useState("")
    const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null)


    const utils = trpc.useUtils()

    const verifyMutation = trpc.shift.verifyShift.useMutation({
        onSuccess: () => {
            toast.success(isRejecting ? "Shift rejected" : "Shift verified successfully")
            setIsRejecting(false)
            setRejectionNotes("") // Reset state
            utils.shift.invalidate() // Invalidate queries
            if (onVerifySuccess) onVerifySuccess() // Trigger callback
        },
        onError: (err) => {
            toast.error(err.message || "Failed to verify shift")
        }
    })

    const resubmitMutation = trpc.shift.resubmitForVerification.useMutation({
        onSuccess: () => {
            toast.success("Shift resubmitted for verification")
            utils.shift.invalidate()
            if (onVerifySuccess) onVerifySuccess()
        },
        onError: (err) => {
            toast.error(err.message || "Failed to resubmit shift")
        }
    })

    const handleVerify = (approved: boolean) => {
        if (!approved && !isRejecting) {
            setIsRejecting(true)
            return
        }

        verifyMutation.mutate({
            shiftId: shift.id,
            approved,
            notes: approved ? undefined : rejectionNotes
        })
    }

    const handleResubmit = () => {
        resubmitMutation.mutate({ shiftId: shift.id })
    }
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
                            <Badge
                                variant={
                                    shift.status === 'completed' ? 'default' :
                                        shift.status === 'verified' ? 'default' :
                                            shift.status === 'pending_verification' ? 'secondary' :
                                                shift.status === 'rejected' ? 'destructive' : 'secondary'
                                }
                                className={
                                    shift.status === 'verified' ? 'bg-green-600 hover:bg-green-700' :
                                        shift.status === 'pending_verification' ? 'bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-200 dark:text-yellow-400 dark:border-yellow-800' : ''
                                }
                            >
                                {shift.status === 'pending_verification' ? 'Pending Review' :
                                    shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
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

            {/* Verification Status Alert */}
            {shift.status === 'pending_verification' && (
                <Alert className="bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                    <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4" />
                    <AlertTitle>Pending Verification</AlertTitle>
                    <AlertDescription>
                        This shift is awaiting administrator verification.
                    </AlertDescription>
                </Alert>
            )}

            {shift.status === 'rejected' && (
                <Alert variant="destructive">
                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                    <AlertTitle>Shift Rejected</AlertTitle>
                    <AlertDescription>
                        <div>
                            This shift has been rejected by {(shift as any).verifiedBy?.name || 'Admin'}.
                            {(shift as any).rejectionNotes && (
                                <div className="mt-2 text-sm bg-background/50 p-2 rounded border border-destructive/20">
                                    <strong>Reason:</strong> {(shift as any).rejectionNotes}
                                </div>
                            )}
                            <div className="mt-3">
                                <Button size="sm" variant="outline" onClick={handleResubmit} disabled={resubmitMutation.isPending}>
                                    <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-3.5 w-3.5" />
                                    Resubmit for Verification
                                </Button>
                            </div>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {shift.status === 'verified' && (
                <Alert className="bg-green-500/10 border-green-500/50 text-green-600 dark:text-green-400">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                    <AlertTitle>Verified Shift</AlertTitle>
                    <AlertDescription>
                        Verified by {(shift as any).verifiedBy?.name || 'Admin'} on {formatDateTime((shift as any).verifiedAt || '')}
                    </AlertDescription>
                </Alert>
            )}

            {/* Admin Verification Controls */}
            {isAdmin && shift.status === 'pending_verification' && (
                <Card className="border-primary/50 shadow-sm bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-lg">Admin Verification</CardTitle>
                        <CardDescription>Review the shift details below and verify or reject this submission.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isRejecting && (
                            <div className="space-y-2">
                                <span className="text-sm font-medium">Rejection Reason (Required)</span>
                                <Textarea
                                    placeholder="Please explain why this shift is being rejected..."
                                    value={rejectionNotes}
                                    onChange={(e) => setRejectionNotes(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="flex gap-3">
                            {!isRejecting ? (
                                <>
                                    <Button
                                        className="flex-1"
                                        onClick={() => handleVerify(true)}
                                        disabled={verifyMutation.isPending}
                                    >
                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-2 h-4 w-4" />
                                        Approve Shift
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setIsRejecting(true)}
                                        disabled={verifyMutation.isPending}
                                    >
                                        <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4 " />
                                        Reject Shift
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={() => handleVerify(false)}
                                        disabled={verifyMutation.isPending || !rejectionNotes.trim()}
                                    >
                                        Confirm Rejection
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setIsRejecting(false)}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Content Sections - Vertically Stacked */}
            <div className="space-y-6">
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
                        {/* Desktop View (Table) */}
                        <div className="hidden md:block rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Nozzle</th>
                                        <th className="text-left p-3 font-medium">Fuel</th>
                                        <th className="text-right p-3 font-medium">Opening</th>
                                        <th className="text-right p-3 font-medium">Closing</th>
                                        <th className="text-right p-3 font-medium">Test Qty</th>
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
                                            <td className="p-3 text-right text-muted-foreground">
                                                {parseFloat(reading.testQty?.toString() || '0').toFixed(2)}
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
                                        <td colSpan={6} className="p-3 text-right">Total Fuel Sales</td>
                                        <td className="p-3 text-right">₹{shift.totalFuelSales.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View (Cards) */}
                        <div className="md:hidden space-y-3">
                            {shift.nozzleReadings.map((reading: any) => (
                                <div key={reading.id} className="rounded-lg border p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{reading.nozzle.code}</Badge>
                                            <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                        </div>
                                        <div className="font-bold">
                                            ₹{reading.amount.toFixed(2)}
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Opening</p>
                                            <p>{parseFloat(reading.openingReading?.toString() || '0').toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground mb-1">Closing</p>
                                            <p>{reading.closingReading
                                                ? parseFloat(reading.closingReading.toString()).toFixed(2)
                                                : '--'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-1">Test Qty</p>
                                            <p>{parseFloat(reading.testQty?.toString() || '0').toFixed(2)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground mb-1">Net Qty</p>
                                            <p className="font-medium">{parseFloat(reading.fuelDispensed?.toString() || '0').toFixed(2)} L</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="rounded-lg bg-muted/30 p-4 flex justify-between items-center font-bold">
                                <span>Total Fuel Sales</span>
                                <span>₹{shift.totalFuelSales.toFixed(2)}</span>
                            </div>
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
                        <div className="rounded-lg border overflow-hidden">
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
                                            <Fragment key={payment.id}>
                                                <tr className="border-t">
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-2">
                                                            {payment.paymentMethod.name}
                                                            {payment.denominations && payment.denominations.length > 0 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                                                                    onClick={() => setExpandedPaymentId(expandedPaymentId === payment.id ? null : payment.id)}
                                                                >
                                                                    {expandedPaymentId === payment.id ? "Hide" : "Details"}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right font-medium">
                                                        ₹{parseFloat(payment.amount.toString()).toFixed(2)}
                                                    </td>
                                                </tr>
                                                {expandedPaymentId === payment.id && payment.denominations && payment.denominations.length > 0 && (
                                                    <tr className="bg-muted/30">
                                                        <td colSpan={2} className="p-3">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                                                {payment.denominations.map((d: any) => (
                                                                    <div key={d.id} className="flex justify-between items-center bg-background border rounded px-2 py-1">
                                                                        <span>{d.denomination?.label || `Note ${d.denominationId}`} <span className="text-muted-foreground">x {d.count}</span></span>
                                                                        <span className="font-medium ml-2">₹{(d.count * (d.denomination?.value || 0)).toLocaleString()}</span>
                                                                    </div>
                                                                ))}
                                                                {Number(payment.coinsAmount) > 0 && (
                                                                    <div className="flex justify-between items-center bg-background border rounded px-2 py-1">
                                                                        <span>Coins</span>
                                                                        <span className="font-medium">₹{Number(payment.coinsAmount).toLocaleString()}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
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
        </div >
    )
}
