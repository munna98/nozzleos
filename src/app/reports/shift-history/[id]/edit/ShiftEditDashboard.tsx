"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    CheckmarkCircle02Icon,
    FuelStationIcon,
    MoneyReceive01Icon,
    PencilEdit01Icon,
    Delete02Icon,
    Cancel01Icon,
    PlusSignIcon,
    Settings01Icon,
    TimeQuarterPassIcon,
    ArrowDown01Icon,
    ArrowUp01Icon
} from "@hugeicons/core-free-icons"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/server/trpc/router"
import { ShiftType } from "@prisma/client"

type RouterOutput = inferRouterOutputs<AppRouter>
type ShiftDetail = NonNullable<RouterOutput['shift']['getById']>
type PaymentMethod = RouterOutput['paymentMethod']['getAll'][number]
type Denomination = RouterOutput['denomination']['getAll'][number]
type Payment = NonNullable<ShiftDetail['sessionPayments']>[number]

// Pre-calculate totals for grouping
interface PaymentMethodSummary {
    methodId: number
    methodName: string
    totalAmount: number
    count: number
    payments: Payment[]
}

interface ShiftEditDashboardProps {
    shift: ShiftDetail
    isAdmin: boolean
    currentUserId?: number
}

export function ShiftEditDashboard({ shift, isAdmin, currentUserId }: ShiftEditDashboardProps) {
    const utils = trpc.useUtils()
    const [selectedMethodId, setSelectedMethodId] = useState("")
    const [manualAmount, setManualAmount] = useState("")
    const [denominationCounts, setDenominationCounts] = useState<Record<number, number>>({})
    const [coinsAmount, setCoinsAmount] = useState("")
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)
    const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null)

    const [editingTestQtyId, setEditingTestQtyId] = useState<number | null>(null)
    const [editingOpeningId, setEditingOpeningId] = useState<number | null>(null)
    const [isFinishDialogOpen, setIsFinishDialogOpen] = useState(false)

    // Shift Details State
    const [shiftDetails, setShiftDetails] = useState({
        shiftType: shift.type,
        status: shift.status,
        notes: shift.notes || '',
        startTime: new Date(shift.startTime),
        endTime: shift.endTime ? new Date(shift.endTime) : undefined,
    })

    // Queries
    const paymentMethodsQuery = trpc.paymentMethod.getAll.useQuery()
    const denominationsQuery = trpc.denomination.getAll.useQuery()
    const settingsQuery = trpc.settings.get.useQuery()

    // Mutations
    const updateShiftMutation = trpc.shift.adminUpdateShift.useMutation({
        onSuccess: () => {
            utils.shift.getById.invalidate({ id: shift.id })
            toast.success("Shift details updated")
        },
        onError: (err) => toast.error(err.message)
    })

    const updateNozzleReadingMutation = trpc.shift.adminUpdateNozzleReading.useMutation({
        onSuccess: () => {
            utils.shift.getById.invalidate({ id: shift.id })
            toast.success("Reading updated")
        },
        onError: (err) => toast.error(err.message)
    })

    const addPaymentMutation = trpc.shift.adminAddPayment.useMutation({
        onSuccess: () => {
            utils.shift.getById.invalidate({ id: shift.id })
            toast.success("Payment added")
            resetPaymentForm()
        },
        onError: (err) => toast.error(err.message)
    })

    const updatePaymentMutation = trpc.shift.adminUpdatePayment.useMutation({
        onSuccess: () => {
            utils.shift.getById.invalidate({ id: shift.id })
            toast.success("Payment updated")
            resetPaymentForm()
            setEditingPaymentId(null)
        },
        onError: (err) => toast.error(err.message)
    })

    const deletePaymentMutation = trpc.shift.adminDeletePayment.useMutation({
        onSuccess: () => {
            utils.shift.getById.invalidate({ id: shift.id })
            toast.success("Payment deleted")
        },
        onError: (err) => toast.error(err.message)
    })

    const finishShiftMutation = trpc.shift.complete.useMutation({
        onSuccess: () => {
            utils.shift.getById.invalidate({ id: shift.id })
            toast.success("Shift finished successfully")
            setIsFinishDialogOpen(false)
        },
        onError: (err) => toast.error(err.message)
    })

    const resubmitMutation = trpc.shift.resubmitForVerification.useMutation({
        onSuccess: () => {
            toast.success("Shift resubmitted for verification")
            utils.shift.invalidate()
            window.location.href = `/reports/shift-history/${shift.id}`
        },
        onError: (err) => toast.error(err.message)
    })

    const resetPaymentForm = () => {
        setSelectedMethodId("")
        setManualAmount("")
        setDenominationCounts({})
        setCoinsAmount("")
        setEditingPaymentId(null)
    }

    // Payment Logic Helpers
    const paymentMethods = paymentMethodsQuery.data || []
    const denominations = denominationsQuery.data || []
    const settings = settingsQuery.data

    const selectedMethod = paymentMethods.find(pm => pm.id.toString() === selectedMethodId)
    const isCashPayment = selectedMethod?.name.toLowerCase() === 'cash'

    // Unlike active shift, we don't auto-select existing cash payment for editing when selecting method.
    // Admin mode is explicit.

    const showDenominations = isCashPayment && settings?.enableDenominationEntry && denominations.length > 0
    const showCoins = showDenominations && settings?.enableCoinEntry

    const calculatedTotal = useMemo(() => {
        if (!showDenominations) return 0
        let total = 0
        for (const denom of denominations) {
            const count = denominationCounts[denom.id] || 0
            total += denom.value * count
        }
        total += parseFloat(coinsAmount) || 0
        return total
    }, [showDenominations, denominations, denominationCounts, coinsAmount])

    useEffect(() => {
        if (!showDenominations) {
            setDenominationCounts({})
            setCoinsAmount("")
        }
    }, [showDenominations])

    // Handlers
    const handleUpdateShiftDetails = () => {
        updateShiftMutation.mutate({
            shiftId: shift.id,
            data: {
                shiftType: shiftDetails.shiftType as ShiftType,
                status: shiftDetails.status as any,
                notes: shiftDetails.notes || undefined,
                startTime: shiftDetails.startTime,
                endTime: shiftDetails.endTime,
            }
        })
    }

    const handleUpdateOpeningReading = (readingId: number, value: number) => {
        updateNozzleReadingMutation.mutate({
            shiftId: shift.id,
            readingId,
            data: { openingReading: value }
        })
    }

    const handleUpdateClosingReading = (readingId: number, value: number) => {
        updateNozzleReadingMutation.mutate({
            shiftId: shift.id,
            readingId,
            data: { closingReading: value }
        })
    }

    const handleUpdateTestQty = (readingId: number, value: number) => {
        updateNozzleReadingMutation.mutate({
            shiftId: shift.id,
            readingId,
            data: { testQty: value }
        })
    }

    const handleAddOrUpdatePayment = () => {
        if (!selectedMethodId) return

        let amount: number
        let denomsToSend: { denominationId: number; count: number }[] | undefined
        let coinsToSend: number | undefined

        if (showDenominations) {
            amount = calculatedTotal
            if (amount <= 0 && !editingPaymentId) return // Allow 0 update? maybe not.

            denomsToSend = Object.entries(denominationCounts)
                .filter(([, count]) => count > 0)
                .map(([denomId, count]) => ({
                    denominationId: parseInt(denomId),
                    count
                }))
            coinsToSend = parseFloat(coinsAmount) || undefined
        } else {
            amount = parseFloat(manualAmount)
            if (!amount || amount < 0) return
        }

        if (editingPaymentId) {
            updatePaymentMutation.mutate({
                shiftId: shift.id,
                paymentId: editingPaymentId,
                data: {
                    amount,
                    paymentMethodId: parseInt(selectedMethodId), // Allow changing method
                    denominations: denomsToSend,
                    coinsAmount: coinsToSend
                }
            })
        } else {
            addPaymentMutation.mutate({
                shiftId: shift.id,
                data: {
                    amount,
                    paymentMethodId: parseInt(selectedMethodId),
                    denominations: denomsToSend,
                    coinsAmount: coinsToSend
                }
            })
        }
    }

    const handleEditPayment = (payment: any) => {
        setSelectedMethodId(payment.paymentMethodId.toString())
        setManualAmount(payment.amount.toString())
        setEditingPaymentId(payment.id)

        // Populate denominations
        const counts: Record<number, number> = {}
        if (payment.denominations) {
            payment.denominations.forEach((d: { denominationId: number; count: number }) => {
                counts[d.denominationId] = d.count
            })
        }
        setDenominationCounts(counts)
        setCoinsAmount(payment.coinsAmount ? payment.coinsAmount.toString() : "")
    }

    const handleDenominationChange = (denomId: number, count: string) => {
        const numCount = parseInt(count) || 0
        setDenominationCounts(prev => ({
            ...prev,
            [denomId]: Math.max(0, numCount)
        }))
    }

    const handleFinishAttempt = () => {
        const allHaveClosing = shift.nozzleReadings.every((r: any) => r.closingReading !== null && r.closingReading !== undefined)
        if (!allHaveClosing) {
            return toast.error("Please enter closing readings for all nozzles")
        }
        setIsFinishDialogOpen(true)
    }



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

    const handleConfirmFinish = () => {
        finishShiftMutation.mutate({
            shiftId: shift.id,
            notes: shiftDetails.notes || undefined,
            endTime: shiftDetails.endTime || undefined
        })
    }

    const handleResubmit = () => {
        resubmitMutation.mutate({ shiftId: shift.id })
    }

    // Calculations for summary display
    const totalCollected = shift.sessionPayments?.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0) || 0
    const shortage = shift.shortage // Already present in getById response

    const elapsedTime = useMemo(() => {
        const start = new Date(shift.startTime).getTime()
        const end = shift.endTime ? new Date(shift.endTime).getTime() : Date.now()
        return Math.floor((end - start) / 1000)
    }, [shift.startTime, shift.endTime])

    return (
        <div className="space-y-6">
            {/* Locked Shift Warning */}
            {shift.status === 'verified' && isAdmin && (
                <Alert className="bg-yellow-500/10 border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                    <AlertTitle>Shift is Locked</AlertTitle>
                    <AlertDescription>
                        This shift is verified and locked. You must request edit permission from the shift owner before making any changes.
                        <Button
                            variant="link"
                            className="p-0 h-auto ml-2 text-yellow-600 dark:text-yellow-400 underline font-medium"
                            onClick={() => window.location.href = `/reports/shift-history/${shift.id}`}
                        >
                            Go to request permission
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Shift Details Update */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {shiftDetails.shiftType ? (shiftDetails.shiftType.charAt(0) + shiftDetails.shiftType.slice(1).toLowerCase() + ' Shift') : 'Shift'}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                {new Date(shift.startTime).toLocaleDateString()}
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Nozzles: {shift.nozzleReadings.length}</p>
                            <p className="text-sm text-muted-foreground">Payments: {shift.sessionPayments?.length || 0}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Shift Type</Label>
                            <Select
                                value={shiftDetails.shiftType}
                                onValueChange={(v) => setShiftDetails(prev => ({ ...prev, shiftType: v as ShiftType }))}
                                disabled={!isAdmin}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ShiftType.MORNING}>Morning</SelectItem>
                                    <SelectItem value={ShiftType.EVENING}>Evening</SelectItem>
                                    <SelectItem value={ShiftType.NIGHT}>Night</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Start Time</Label>
                            <DateTimePicker
                                date={shiftDetails.startTime}
                                setDate={(date) => setShiftDetails(prev => ({ ...prev, startTime: date || new Date() }))}
                                disabled={!isAdmin}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Time</Label>
                            <DateTimePicker
                                date={shiftDetails.endTime}
                                setDate={(date) => setShiftDetails(prev => ({ ...prev, endTime: date }))}
                                disabled={!isAdmin}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                                value={shiftDetails.notes}
                                onChange={(e) => setShiftDetails(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Shift notes..."
                                className="h-10"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleUpdateShiftDetails} disabled={updateShiftMutation.isPending}>
                            {updateShiftMutation.isPending ? "Updating..." : "Update Details"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left: Nozzles */}
                <div className="md:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <HugeiconsIcon icon={FuelStationIcon} />
                            Nozzle Readings
                        </h3>
                    </div>

                    {shift.nozzleReadings.map((reading: any) => (
                        <Card key={reading.id}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge>{reading.nozzle.code}</Badge>
                                        <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <p className="text-muted-foreground flex items-center gap-2">
                                            Opening
                                            {!editingOpeningId && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 text-muted-foreground hover:text-primary"
                                                    onClick={() => setEditingOpeningId(reading.id)}
                                                >
                                                    <HugeiconsIcon icon={PencilEdit01Icon} className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </p>
                                        {editingOpeningId === reading.id ? (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    className="h-7 w-20 px-2 text-sm"
                                                    defaultValue={parseFloat(reading.openingReading.toString())}
                                                    id={`opening-${reading.id}`}
                                                    autoFocus
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => {
                                                        const input = document.getElementById(`opening-${reading.id}`) as HTMLInputElement
                                                        const val = parseFloat(input.value) || 0
                                                        handleUpdateOpeningReading(reading.id, val)
                                                        setEditingOpeningId(null)
                                                    }}
                                                >
                                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setEditingOpeningId(null)}
                                                >
                                                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="font-medium">
                                                {parseFloat(reading.openingReading.toString()).toFixed(2)} L
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground flex items-center gap-2">
                                            Test Qty
                                            {!editingTestQtyId && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 text-muted-foreground hover:text-primary"
                                                    onClick={() => setEditingTestQtyId(reading.id)}
                                                >
                                                    <HugeiconsIcon icon={PencilEdit01Icon} className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </p>
                                        {editingTestQtyId === reading.id ? (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    className="h-7 w-20 px-2 text-sm"
                                                    defaultValue={parseFloat(reading.testQty.toString())}
                                                    id={`test-qty-${reading.id}`}
                                                    autoFocus
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => {
                                                        const input = document.getElementById(`test-qty-${reading.id}`) as HTMLInputElement
                                                        const val = parseFloat(input.value) || 0
                                                        handleUpdateTestQty(reading.id, val)
                                                        setEditingTestQtyId(null)
                                                    }}
                                                >
                                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setEditingTestQtyId(null)}
                                                >
                                                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                {Number(reading.testQty) > 0 ? (
                                                    <p className="font-medium">
                                                        {parseFloat(reading.testQty.toString()).toFixed(2)} L
                                                    </p>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 text-xs px-2 border-dashed text-muted-foreground"
                                                        onClick={() => setEditingTestQtyId(reading.id)}
                                                    >
                                                        + Add Test Qty
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {reading.closingReading !== null && (
                                        <div>
                                            <p className="text-muted-foreground">Qty Dispensed</p>
                                            <p className="font-medium">
                                                {(
                                                    parseFloat(reading.closingReading.toString()) -
                                                    parseFloat(reading.openingReading.toString()) -
                                                    parseFloat(reading.testQty.toString())
                                                ).toFixed(2)} L
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`closing-${reading.id}`}>Closing Reading</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id={`closing-${reading.id}`}
                                            type="number"
                                            step="0.01"
                                            placeholder="Enter closing reading"
                                            defaultValue={
                                                reading.closingReading !== null
                                                    ? parseFloat(reading.closingReading.toString())
                                                    : ""
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    const value = parseFloat(e.currentTarget.value)
                                                    if (!isNaN(value)) {
                                                        handleUpdateClosingReading(reading.id, value)
                                                    }
                                                }
                                            }}
                                        />
                                        <Button
                                            onClick={() => {
                                                const input = document.getElementById(`closing-${reading.id}`) as HTMLInputElement
                                                const value = parseFloat(input.value)
                                                if (!isNaN(value)) {
                                                    handleUpdateClosingReading(reading.id, value)
                                                }
                                            }}
                                            size="icon"
                                        >
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Right: Payments */}
                <div className="md:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <HugeiconsIcon icon={MoneyReceive01Icon} />
                            Payments Collected
                        </h3>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">{editingPaymentId ? "Edit Payment" : "Add Payment"}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    <Combobox
                                        items={paymentMethods}
                                        value={selectedMethod || null}
                                        onValueChange={(val: PaymentMethod | null) => setSelectedMethodId(val?.id.toString() ?? "")}
                                        itemToStringLabel={(item: PaymentMethod) => item?.name ?? ""}
                                    >
                                        <ComboboxInput placeholder="Select Method" showClear />
                                        <ComboboxContent>
                                            <ComboboxEmpty>No items found.</ComboboxEmpty>
                                            <ComboboxList>
                                                {(item: PaymentMethod) => (
                                                    <ComboboxItem key={item.id} value={item} className="justify-between">
                                                        <span>{item.name}</span>
                                                        {methodSummaries[item.id] && (
                                                            <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5 font-normal">
                                                                ₹{methodSummaries[item.id].totalAmount.toLocaleString()} {methodSummaries[item.id].count > 1 && `(${methodSummaries[item.id].count})`}
                                                            </Badge>
                                                        )}
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>

                                {/* Denomination Grid for Cash */}
                                {showDenominations && (
                                    <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {denominations.map((denom) => (
                                                <div key={denom.id} className="grid grid-cols-[1fr_auto_1fr] items-center p-2 rounded-lg border bg-card shadow-sm gap-1">
                                                    <span className="font-bold text-base truncate">{denom.label}</span>
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <span className="text-muted-foreground text-xs">×</span>
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            min="0"
                                                            className="w-16 text-center"
                                                            value={denominationCounts[denom.id] || ""}
                                                            onChange={(e) => handleDenominationChange(denom.id, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium text-right text-muted-foreground truncate">
                                                        ₹{((denominationCounts[denom.id] || 0) * denom.value).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {showCoins && (
                                            <>
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider pt-2">Coins</Label>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-14 text-sm font-medium">Total</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="flex-1"
                                                        value={coinsAmount}
                                                        onChange={(e) => setCoinsAmount(e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className="pt-2 border-t flex justify-between items-center">
                                            <span className="font-medium">Total</span>
                                            <span className="text-xl font-bold text-primary">
                                                ₹{calculatedTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Manual amount */}
                                {!showDenominations && selectedMethodId && (
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <Input
                                            type="number"
                                            value={manualAmount}
                                            onChange={(e) => setManualAmount(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                )}


                                <div className="flex gap-2">
                                    {editingPaymentId && (
                                        <Button variant="outline" className="flex-1" onClick={resetPaymentForm}>
                                            Cancel
                                        </Button>
                                    )}
                                    <Button
                                        className="flex-1"
                                        onClick={handleAddOrUpdatePayment}
                                        disabled={addPaymentMutation.isPending || updatePaymentMutation.isPending}
                                    >
                                        {editingPaymentId ? "Update" : "Add"} Payment
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Payment History</p>
                            {/* Flat Payment List */}
                            {(shift.sessionPayments || []).length === 0 ? (
                                <p className="text-center text-muted-foreground text-sm py-4">
                                    No payments recorded yet.
                                </p>
                            ) : (
                                (shift.sessionPayments || [])
                                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .map((payment) => (
                                        <div key={payment.id} className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/40 transition-colors bg-card text-card-foreground shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{payment.paymentMethod?.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold">₹{parseFloat(payment.amount.toString()).toLocaleString()}</span>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleEditPayment(payment)
                                                            }}
                                                        >
                                                            <HugeiconsIcon icon={PencilEdit01Icon} className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                if (confirm("Delete payment?")) deletePaymentMutation.mutate({ shiftId: shift.id, paymentId: payment.id })
                                                            }}
                                                        >
                                                            <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Denomination Details */}
                                            {expandedPaymentId === payment.id && payment.denominations && payment.denominations.length > 0 && (
                                                <div className="mt-1 pt-2 border-t text-sm bg-muted/30 p-2 rounded-md">
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                        {payment.denominations.map((d: any) => (
                                                            <div key={d.id} className="flex justify-between items-center text-xs">
                                                                <span>{d.denomination?.label || `Note ${d.denominationId}`} <span className="text-muted-foreground">x {d.count}</span></span>
                                                                <span className="font-medium">₹{(d.count * (d.denomination?.value || 0)).toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        {Number(payment.coinsAmount) > 0 && (
                                                            <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed mt-1 col-span-2">
                                                                <span>Coins</span>
                                                                <span className="font-medium">₹{Number(payment.coinsAmount).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                            )}
                            {(!shift.sessionPayments || shift.sessionPayments.length === 0) && (
                                <p className="text-center text-muted-foreground text-sm py-4">
                                    No payments recorded yet.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Card className="bg-primary/5 border-primary/20 h-24 flex flex-col justify-center">
                            <CardContent className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1 font-semibold">Total Collected</p>
                                <p className="text-2xl font-bold text-primary">
                                    ₹{totalCollected.toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={`${shortage < 0 ? 'bg-destructive/10 border-destructive/20' : shortage > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/50 border-muted-foreground/20'} h-12 flex flex-col justify-center overflow-hidden`}>
                            <CardContent className="p-1 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <p className="text-[10px] text-muted-foreground font-semibold leading-none mb-1">
                                        {shortage < 0 ? 'Shortage' : shortage > 0 ? 'Excess' : 'Status'}
                                    </p>
                                    <p className={`text-base font-bold leading-none ${shortage < 0 ? 'text-destructive' : shortage > 0 ? 'text-green-600' : ''}`}>
                                        {shortage ? `₹${Math.abs(shortage).toFixed(2)}` : '₹0.00'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {shift.status === 'in_progress' && (
                        <div className="pt-6 border-t">
                            <Button className="w-full" size="lg" onClick={handleFinishAttempt}>
                                Finish Shift
                            </Button>
                        </div>
                    )}

                    {shift.status === 'rejected' && (
                        <div className="pt-6 border-t">
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleResubmit}
                                disabled={resubmitMutation.isPending}
                            >
                                {resubmitMutation.isPending ? "Resubmitting..." : "Resubmit for Verification"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Finish Shift Dialog */}
            <Dialog open={isFinishDialogOpen} onOpenChange={setIsFinishDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Finish Shift</DialogTitle>
                        <DialogDescription>
                            Review the shift summary before finalizing.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-muted rounded-lg text-center">
                                <p className="text-xs text-muted-foreground mb-1">Fuel Sales</p>
                                <p className="font-bold">₹{shift.totalFuelSales?.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg text-center">
                                <p className="text-xs text-muted-foreground mb-1">Collected</p>
                                <p className="font-bold">₹{totalCollected.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className={`p-4 rounded-lg text-center ${shortage < 0 ? 'bg-destructive/10 text-destructive' : shortage > 0 ? 'bg-green-500/10 text-green-700' : 'bg-muted'}`}>
                            <p className="text-sm font-semibold mb-1">
                                {shortage < 0 ? 'Shortage' : shortage > 0 ? 'Excess' : 'Balanced'}
                            </p>
                            <p className="text-2xl font-bold">
                                ₹{Math.abs(shortage).toFixed(2)}
                            </p>
                        </div>

                        <div className="text-sm text-center text-muted-foreground px-4">
                            Ending this shift will release assigned nozzles and submit for verification.
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFinishDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmFinish} disabled={finishShiftMutation.isPending}>
                            {finishShiftMutation.isPending ? "Finishing..." : "Confirm Finish"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
