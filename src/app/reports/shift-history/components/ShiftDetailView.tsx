"use client"

import { useState, Fragment, useMemo } from "react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, FuelStationIcon, MoneyReceive01Icon, PencilEdit01Icon, Calendar01Icon, UserCircleIcon, CheckmarkCircle02Icon, Cancel01Icon, InformationCircleIcon, RefreshIcon, ArrowDown01Icon, ArrowUp01Icon, Delete02Icon, MoreVerticalIcon } from "@hugeicons/core-free-icons"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import { EditRequestDialog } from "@/app/shift/components/EditRequestDialog"
import { LockKeyIcon } from "@hugeicons/core-free-icons"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { inferRouterOutputs } from '@trpc/server'
import { AppRouter } from '@/server/trpc/router'

type RouterOutput = inferRouterOutputs<AppRouter>
type ShiftDetail = NonNullable<RouterOutput['shift']['getById']>
type Payment = NonNullable<ShiftDetail['sessionPayments']>[number]

interface PaymentMethodSummary {
    methodId: number
    methodName: string
    totalAmount: number
    count: number
    payments: Payment[]
}

interface ShiftDetailProps {
    shift: ShiftDetail
    isAdmin: boolean
    currentUserId?: number
    onBack: () => void
    onVerifySuccess?: () => void
}

export function ShiftDetailView({ shift, isAdmin, currentUserId, onBack, onVerifySuccess }: ShiftDetailProps) {
    const isShiftOwner = currentUserId === shift.userId
    const [isRejecting, setIsRejecting] = useState(false)
    const [rejectionNotes, setRejectionNotes] = useState("")
    const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null)
    const [showApproveDialog, setShowApproveDialog] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showEditRequestDialog, setShowEditRequestDialog] = useState(false)
    const [hasPendingRequest, setHasPendingRequest] = useState(!!(shift.editRequests && shift.editRequests.length > 0))


    const [expandedGroupIds, setExpandedGroupIds] = useState<number[]>([])

    // Calculate method totals
    const methodSummaries = useMemo(() => {
        const summaries: Record<number, PaymentMethodSummary> = {}

        shift.sessionPayments?.forEach(payment => {
            if (!summaries[payment.paymentMethodId]) {
                summaries[payment.paymentMethodId] = {
                    methodId: payment.paymentMethodId,
                    methodName: payment.paymentMethod.name,
                    totalAmount: 0,
                    count: 0,
                    payments: []
                }
            }

            summaries[payment.paymentMethodId].totalAmount += parseFloat(payment.amount.toString())
            summaries[payment.paymentMethodId].count += 1
            summaries[payment.paymentMethodId].payments.push(payment)
        })

        return summaries
    }, [shift.sessionPayments])

    const toggleGroup = (methodId: number) => {
        setExpandedGroupIds(prev =>
            prev.includes(methodId)
                ? prev.filter(id => id !== methodId)
                : [...prev, methodId]
        )
    }

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

    const cancelEditMutation = trpc.shiftEditRequest.cancel.useMutation({
        onSuccess: () => {
            toast.success("Edit request cancelled")
            setHasPendingRequest(false)
            utils.shift.invalidate()
            if (onVerifySuccess) onVerifySuccess()
        },
        onError: (err) => {
            toast.error(err.message || "Failed to cancel edit request")
        }
    })

    const deleteMutation = trpc.shift.delete.useMutation({
        onSuccess: () => {
            toast.success("Shift deleted successfully")
            setShowDeleteDialog(false)
            if (onBack) onBack() // Go back to list
            utils.shift.invalidate()
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete shift")
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

    const confirmApproval = () => {
        verifyMutation.mutate({
            shiftId: shift.id,
            approved: true,
        })
        setShowApproveDialog(false)
    }

    const confirmRejection = () => {
        verifyMutation.mutate({
            shiftId: shift.id,
            approved: false,
            notes: rejectionNotes
        })
        setShowRejectDialog(false)
        setIsRejecting(false)
        setRejectionNotes("")
    }

    const handleResubmit = () => {
        resubmitMutation.mutate({ shiftId: shift.id })
    }

    const handleDelete = () => {
        deleteMutation.mutate({ shiftId: shift.id })
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
                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                                {shift.type ? (shift.type.charAt(0) + shift.type.slice(1).toLowerCase() + ' Shift') : 'Shift'}
                            </h1>
                            <Badge
                                variant={
                                    shift.status === 'completed' ? 'default' :
                                        shift.status === 'verified' ? 'default' :
                                            shift.status === 'pending_verification' ? 'secondary' :
                                                shift.status === 'in_progress' ? 'default' :
                                                    shift.status === 'rejected' ? 'destructive' : 'secondary'
                                }
                                className={
                                    shift.status === 'verified' ? 'bg-green-600 hover:bg-green-700' :
                                        shift.status === 'pending_verification' ? 'bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-200 dark:text-yellow-400 dark:border-yellow-800' :
                                            shift.status === 'in_progress' ? 'bg-blue-600 hover:bg-blue-700' : ''
                                }
                            >
                                {shift.status === 'pending_verification' ? 'Pending Review' :
                                    shift.status === 'in_progress' ? 'In Progress' :
                                        shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
                            </Badge>
                        </div>
                        <div className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-4 text-xs md:text-sm text-muted-foreground mt-1">
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
                <div className="flex items-center gap-2">
                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-2">
                        {/* Edit button: Admin can edit non-verified shifts, Owner can edit rejected shifts */}
                        {((isAdmin && shift.status !== 'verified') || (isShiftOwner && shift.status === 'rejected')) && (
                            <Button
                                onClick={() => window.location.href = `/reports/shift-history/${shift.id}/edit`}
                                className="gap-2"
                            >
                                <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                <span>{shift.status === 'rejected' ? 'Edit & Resubmit' : 'Edit Shift'}</span>
                            </Button>
                        )}

                        {/* Request Edit button: Admin wants to edit a verified shift */}
                        {(isAdmin && shift.status === 'verified') && (
                            <>
                                {hasPendingRequest ? (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (confirm("Are you sure you want to cancel this edit request?")) {
                                                cancelEditMutation.mutate({ requestId: shift.editRequests![0].id })
                                            }
                                        }}
                                        disabled={cancelEditMutation.isPending}
                                        className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                                    >
                                        <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                                        <span>Cancel Edit Request</span>
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowEditRequestDialog(true)}
                                        className="gap-2 border-primary text-primary hover:bg-primary hover:text-white"
                                    >
                                        <HugeiconsIcon icon={LockKeyIcon} className="h-4 w-4" />
                                        <span>Request Edit Permission</span>
                                    </Button>
                                )}
                            </>
                        )}

                        {/* Delete button: Admin can delete in_progress or pending_verification shifts */}
                        {isAdmin && (shift.status === 'in_progress' || shift.status === 'pending_verification') && (
                            <Button
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                <span className="ml-2">Delete Shift</span>
                            </Button>
                        )}
                    </div>

                    {/* Mobile Actions (Dropdown) */}
                    <div className="md:hidden">
                        {(
                            ((isAdmin && shift.status !== 'verified') || (isShiftOwner && shift.status === 'rejected')) ||
                            (isAdmin && shift.status === 'verified') ||
                            (isAdmin && (shift.status === 'in_progress' || shift.status === 'pending_verification'))
                        ) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <HugeiconsIcon icon={MoreVerticalIcon} className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        {((isAdmin && shift.status !== 'verified') || (isShiftOwner && shift.status === 'rejected')) && (
                                            <DropdownMenuItem
                                                onClick={() => window.location.href = `/reports/shift-history/${shift.id}/edit`}
                                            >
                                                <HugeiconsIcon icon={PencilEdit01Icon} className="mr-2 h-4 w-4" />
                                                <span>{shift.status === 'rejected' ? 'Edit & Resubmit' : 'Edit Shift'}</span>
                                            </DropdownMenuItem>
                                        )}

                                        {(isAdmin && shift.status === 'verified') && (
                                            <>
                                                {hasPendingRequest ? (
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to cancel this edit request?")) {
                                                                cancelEditMutation.mutate({ requestId: shift.editRequests![0].id })
                                                            }
                                                        }}
                                                        disabled={cancelEditMutation.isPending}
                                                    >
                                                        <HugeiconsIcon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
                                                        <span>Cancel Request</span>
                                                    </DropdownMenuItem>
                                                ) : (
                                                    <DropdownMenuItem
                                                        onClick={() => setShowEditRequestDialog(true)}
                                                    >
                                                        <HugeiconsIcon icon={LockKeyIcon} className="mr-2 h-4 w-4" />
                                                        <span>Request Edit</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </>
                                        )}

                                        {isAdmin && (shift.status === 'in_progress' || shift.status === 'pending_verification') && (
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() => setShowDeleteDialog(true)}
                                            >
                                                <HugeiconsIcon icon={Delete02Icon} className="mr-2 h-4 w-4" />
                                                <span>Delete Shift</span>
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                    </div>
                </div>
            </div>

            <EditRequestDialog
                open={showEditRequestDialog}
                onOpenChange={setShowEditRequestDialog}
                shiftId={shift.id}
                shiftType={shift.type}
                onSuccess={() => {
                    setHasPendingRequest(true)
                    utils.shift.invalidate()
                    if (onVerifySuccess) onVerifySuccess()
                }}
            />

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
                            {/* Only show resubmit button to shift owner, not to admin */}
                            {isShiftOwner && (
                                <div className="mt-3">
                                    <Button size="sm" variant="outline" onClick={handleResubmit} disabled={resubmitMutation.isPending}>
                                        <HugeiconsIcon icon={RefreshIcon} className="mr-2 h-3.5 w-3.5" />
                                        Resubmit for Verification
                                    </Button>
                                </div>
                            )}
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

            {/* Edit Request Pending Alert */}
            {shift.status === 'verified' && hasPendingRequest && shift.editRequests && shift.editRequests.length > 0 && (
                <Alert className="bg-blue-500/10 border-blue-500/50 text-blue-600 dark:text-blue-400">
                    <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4" />
                    <AlertTitle>Edit Request Pending</AlertTitle>
                    <AlertDescription>
                        An edit request was submitted by {shift.editRequests[0].requestedByUser.name || shift.editRequests[0].requestedByUser.username} on {formatDateTime(shift.editRequests[0].createdAt)}.
                        Awaiting approval from the shift owner.
                    </AlertDescription>
                </Alert>
            )}

            {/* Admin Verification Controls */}
            {
                isAdmin && shift.status === 'pending_verification' && (
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
                                            onClick={() => setShowApproveDialog(true)}
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
                                            onClick={() => setShowRejectDialog(true)}
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
                )
            }

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
                                        Object.values(methodSummaries)
                                            .sort((a, b) => b.totalAmount - a.totalAmount)
                                            .map((summary) => (
                                                <Fragment key={summary.methodId}>
                                                    <tr
                                                        className="border-t hover:bg-muted/50 cursor-pointer transition-colors"
                                                        onClick={() => toggleGroup(summary.methodId)}
                                                    >
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{summary.methodName}</span>
                                                                {summary.count > 1 && (
                                                                    <span className="text-[10px] text-muted-foreground font-medium ml-2">
                                                                        ({summary.count})
                                                                    </span>
                                                                )}
                                                                {summary.count === 1 && summary.payments[0]?.denominations?.length > 0 && (
                                                                    <span className="text-[10px] text-muted-foreground font-medium ml-2">
                                                                        {expandedGroupIds.includes(summary.methodId) ? "Hide Details" : "View Details"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-bold">
                                                            ₹{summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Payments List */}
                                                    {expandedGroupIds.includes(summary.methodId) && (
                                                        <tr className="bg-muted/10">
                                                            <td colSpan={2} className="p-0">
                                                                {summary.count === 1 && summary.payments[0]?.denominations?.length > 0 ? (
                                                                    <div className="p-3 pl-10 pr-6 bg-background/50">
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                                                                            {summary.payments[0].denominations.map((d: any) => (
                                                                                <div key={d.id} className="flex justify-between items-center py-0.5 last:border-0 border-muted">
                                                                                    <span className="text-muted-foreground">{d.denomination?.label} × {d.count}</span>
                                                                                    <span className="font-medium">₹{(d.count * (d.denomination?.value || 0)).toLocaleString()}</span>
                                                                                </div>
                                                                            ))}
                                                                            {Number(summary.payments[0].coinsAmount) > 0 && (
                                                                                <div className="flex justify-between mt-1 pt-1 col-span-full border-muted">
                                                                                    <span className="text-muted-foreground">Coins</span>
                                                                                    <span className="font-medium">₹{Number(summary.payments[0].coinsAmount).toLocaleString()}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="divide-y border-y">
                                                                        {summary.payments
                                                                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                                                            .map((payment) => (
                                                                                <div key={payment.id} className="p-3 pl-10 pr-6 flex flex-col gap-2">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-xs text-muted-foreground">
                                                                                                {new Date(payment.createdAt).toLocaleTimeString()}
                                                                                            </span>
                                                                                            {payment.denominations && payment.denominations.length > 0 && (
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation()
                                                                                                        setExpandedPaymentId(expandedPaymentId === payment.id ? null : payment.id)
                                                                                                    }}
                                                                                                >
                                                                                                    {expandedPaymentId === payment.id ? "Hide Details" : "View Details"}
                                                                                                </Button>
                                                                                            )}
                                                                                        </div>
                                                                                        <span className="font-medium text-xs">₹{parseFloat(payment.amount.toString()).toFixed(2)}</span>
                                                                                    </div>

                                                                                    {/* Denomination Details */}
                                                                                    {expandedPaymentId === payment.id && payment.denominations && payment.denominations.length > 0 && (
                                                                                        <div className="bg-background border rounded p-2 text-xs">
                                                                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                                                                {payment.denominations.map((d: any) => (
                                                                                                    <div key={d.id} className="flex justify-between">
                                                                                                        <span>{d.denomination?.label} x {d.count}</span>
                                                                                                        <span className="font-medium">₹{(d.count * (d.denomination?.value || 0)).toLocaleString()}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                                {Number(payment.coinsAmount) > 0 && (
                                                                                                    <div className="flex justify-between border-t border-dashed mt-1 pt-1 col-span-2">
                                                                                                        <span>Coins</span>
                                                                                                        <span className="font-medium">₹{Number(payment.coinsAmount).toLocaleString()}</span>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                    </div>
                                                                )}
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

            {/* Approve Confirmation Dialog */}
            <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Shift?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to approve the {shift.type?.toLowerCase()} shift for {shift.user?.name || shift.user?.username}. This action will mark the shift as verified.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="mt-3 space-y-1 text-sm px-6">
                        <div className="flex justify-between">
                            <span className="font-medium">Total Fuel Sales:</span>
                            <span>₹{shift.totalFuelSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium">Total Collected:</span>
                            <span>₹{shift.totalCollected.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium">Shortage/Excess:</span>
                            <span className={shift.shortage > 0 ? 'text-green-600' : shift.shortage < 0 ? 'text-red-600' : ''}>
                                {shift.shortage > 0 ? '+' : shift.shortage < 0 ? '-' : ''}₹{Math.abs(shift.shortage).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={verifyMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmApproval} disabled={verifyMutation.isPending}>
                            Approve Shift
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Confirmation Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Shift?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to reject the {shift.type?.toLowerCase()} shift for {shift.user?.name || shift.user?.username}. The staff member will be notified and can resubmit the shift after making corrections.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="px-6">
                        <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm font-medium mb-1">Rejection Reason:</p>
                            <p className="text-sm italic">{rejectionNotes || 'No reason provided'}</p>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={verifyMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmRejection}
                            disabled={verifyMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Reject Shift
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Shift?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this shift? This action cannot be undone.
                            This will permanently remove the shift session and all associated data including readings and payments.
                            {shift.status === 'in_progress' && " Associated nozzles will be released."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Shift"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}
