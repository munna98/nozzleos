"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    CheckmarkCircle02Icon,
    FuelStationIcon,
    MoneyReceive01Icon,
    TimeQuarterPassIcon,
    PencilEdit01Icon,
    Delete02Icon,
    Cancel01Icon,
    PlusSignIcon,
    InformationCircleIcon,
    ArrowDown01Icon,
    ArrowUp01Icon
} from "@hugeicons/core-free-icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import type { inferRouterOutputs } from "@trpc/server"
import { trpc } from "@/lib/trpc"
import type { AppRouter } from "@/server/trpc/router"
import { toast } from "sonner"

type RouterOutputs = inferRouterOutputs<AppRouter>
type ShiftSession = NonNullable<RouterOutputs['shift']['getActive']>
type PaymentMethod = RouterOutputs['paymentMethod']['getAll'][number]
type NozzleReading = ShiftSession['nozzleReadings'][number]
type SessionPayment = NonNullable<ShiftSession['sessionPayments']>[number]
type Denomination = RouterOutputs['denomination']['getAll'][number]
type Settings = RouterOutputs['settings']['get']
type ShiftSummary = RouterOutputs['shift']['getSummary']

// Pre-calculate totals for grouping
interface PaymentMethodSummary {
    methodId: number
    methodName: string
    totalAmount: number
    count: number
    payments: SessionPayment[]
}

interface DenominationCount {
    denominationId: number
    count: number
}

interface PaymentData {
    methodId: number
    amount: number
    paymentId?: number
    denominations?: DenominationCount[]
    coinsAmount?: number
}

interface ShiftDashboardStepProps {
    session: ShiftSession
    elapsedTime: number
    paymentMethods: PaymentMethod[]
    denominations?: Denomination[]
    settings?: Settings | null
    onUpdateClosingReading: (readingId: number, closingReading: number) => void
    onUpdateTestQty: (readingId: number, testQty: number) => void
    onAddPayment: (data: PaymentData) => void
    onDeletePayment: (paymentId: number) => void
    onFinishShift: () => void
    isSubmitting?: boolean
    summary?: ShiftSummary
}

export function ShiftDashboardStep({
    session,
    elapsedTime,
    paymentMethods,
    denominations = [],
    settings,
    onUpdateClosingReading,
    onUpdateTestQty,
    onAddPayment,
    onDeletePayment,
    onFinishShift,
    isSubmitting,
    summary
}: ShiftDashboardStepProps) {
    const [selectedMethodId, setSelectedMethodId] = useState("")
    const [manualAmount, setManualAmount] = useState("")
    const [denominationCounts, setDenominationCounts] = useState<Record<number, number>>({})
    const [coinsAmount, setCoinsAmount] = useState("")
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)
    const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null)

    const [editingTestQtyId, setEditingTestQtyId] = useState<number | null>(null)

    // Add Nozzle State
    const [isAddNozzleOpen, setIsAddNozzleOpen] = useState(false)
    const [selectedNozzleToAdd, setSelectedNozzleToAdd] = useState<string>("")
    // Remove Nozzle State
    const [nozzleToRemove, setNozzleToRemove] = useState<NozzleReading | null>(null)
    const [isRemoveNozzleOpen, setIsRemoveNozzleOpen] = useState(false)

    const utils = trpc.useUtils()
    const availableNozzlesQuery = trpc.nozzle.getAvailable.useQuery(undefined, {
        enabled: isAddNozzleOpen
    })
    const addNozzleMutation = trpc.shift.addNozzle.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.shift.getSummary.invalidate()
            utils.nozzle.getAll.invalidate()
            utils.nozzle.getAvailable.invalidate()
            toast.success("Nozzle added to shift")
            setIsAddNozzleOpen(false)
            setSelectedNozzleToAdd("")
        },
        onError: (error) => toast.error(error.message)
    })

    const removeNozzleMutation = trpc.shift.removeNozzle.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.shift.getSummary.invalidate()
            utils.nozzle.getAll.invalidate()
            utils.nozzle.getAvailable.invalidate()
            toast.success("Nozzle removed from shift")
            setIsRemoveNozzleOpen(false)
            setNozzleToRemove(null)
        },
        onError: (error) => toast.error(error.message)
    })

    const handleAddNozzle = () => {
        if (!selectedNozzleToAdd) return
        addNozzleMutation.mutate({
            shiftId: session.id,
            nozzleId: parseInt(selectedNozzleToAdd)
        })
    }

    const handleRemoveNozzleClick = (reading: NozzleReading) => {
        if (session.nozzleReadings.length <= 1) {
            toast.error("Cannot remove the last nozzle")
            return
        }
        setNozzleToRemove(reading)
        setIsRemoveNozzleOpen(true)
    }

    const handleConfirmRemoveNozzle = () => {
        if (!nozzleToRemove) return
        removeNozzleMutation.mutate({
            shiftId: session.id,
            nozzleId: nozzleToRemove.nozzleId
        })
    }


    // Check if selected method is Cash and denomination entry is enabled
    const selectedMethod = paymentMethods.find(pm => pm.id.toString() === selectedMethodId)
    const isCashPayment = selectedMethod?.id === 1
    const existingCashPayment = session.sessionPayments.find(p => p.paymentMethodId === 1)

    // Auto-edit existing cash payment when "Cash" is selected
    useEffect(() => {
        if (isCashPayment && existingCashPayment && editingPaymentId !== existingCashPayment.id) {
            handleEditPayment(existingCashPayment)
        }
    }, [isCashPayment, existingCashPayment, editingPaymentId])

    const showDenominations = isCashPayment && settings?.enableDenominationEntry && denominations.length > 0
    const showCoins = showDenominations && settings?.enableCoinEntry

    // Calculate total from denominations + coins
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

    // Reset denomination counts when method changes
    useEffect(() => {
        if (!showDenominations) {
            setDenominationCounts({})
            setCoinsAmount("")
        }
    }, [showDenominations])

    const handleDenominationChange = (denomId: number, count: string) => {
        const numCount = parseInt(count) || 0
        setDenominationCounts(prev => ({
            ...prev,
            [denomId]: Math.max(0, numCount)
        }))
    }

    const handleAddPayment = () => {
        if (!selectedMethodId) return

        let amount: number
        let denomsToSend: DenominationCount[] | undefined
        let coinsToSend: number | undefined

        if (showDenominations) {
            amount = calculatedTotal
            if (amount <= 0) return

            denomsToSend = Object.entries(denominationCounts)
                .filter(([, count]) => count > 0)
                .map(([denomId, count]) => ({
                    denominationId: parseInt(denomId),
                    count
                }))
            coinsToSend = parseFloat(coinsAmount) || undefined
        } else {
            amount = parseFloat(manualAmount)
            if (!amount || amount <= 0) return
        }

        onAddPayment({
            methodId: parseInt(selectedMethodId),
            amount,
            paymentId: editingPaymentId || undefined,
            denominations: denomsToSend,
            coinsAmount: coinsToSend
        })

        // Reset form
        setSelectedMethodId("")
        setManualAmount("")
        setDenominationCounts({})
        setCoinsAmount("")
        setEditingPaymentId(null)
    }

    const handleEditPayment = (payment: SessionPayment) => {
        setSelectedMethodId(payment.paymentMethodId.toString())
        setManualAmount(payment.amount.toString())
        setEditingPaymentId(payment.id)

        // Restore denomination counts
        const counts: Record<number, number> = {}
        if (payment.denominations) {
            payment.denominations.forEach((d: { denominationId: number; count: number }) => {
                counts[d.denominationId] = d.count
            })
        }
        setDenominationCounts(counts)

        // Restore coins
        setCoinsAmount(payment.coinsAmount ? payment.coinsAmount.toString() : "")
    }

    const handleCancelEdit = () => {
        setSelectedMethodId("")
        setManualAmount("")
        setDenominationCounts({})
        setCoinsAmount("")
        setEditingPaymentId(null)
    }



    // Calculate method totals
    const methodSummaries = useMemo(() => {
        const summaries: Record<number, PaymentMethodSummary> = {}

        // Initialize with all available methods to show 0 for unused ones if needed, 
        // or just rely on payments. Let's start with empty.

        session.sessionPayments?.forEach(payment => {
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
    }, [session.sessionPayments])

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {session.type ? (session.type.charAt(0) + session.type.slice(1).toLowerCase() + ' Shift') : 'Shift'}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <HugeiconsIcon icon={TimeQuarterPassIcon} className="h-4 w-4" />
                                {Math.floor(elapsedTime / 3600).toString().padStart(2, '0')}:{Math.floor((elapsedTime % 3600) / 60).toString().padStart(2, '0')} elapsed
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Nozzles: {session.nozzleReadings.length}</p>
                            <p className="text-sm text-muted-foreground">Payments: {session.sessionPayments?.length || 0}</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left: Nozzles */}
                <div className="md:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <HugeiconsIcon icon={FuelStationIcon} />
                            Nozzle Readings
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => setIsAddNozzleOpen(true)}>
                            <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                            Add Nozzle
                        </Button>
                    </div>

                    {[...session.nozzleReadings]
                        .sort((a, b) => a.nozzle.code.localeCompare(b.nozzle.code))
                        .map((reading: NozzleReading) => (
                            <Card key={reading.id}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge>{reading.nozzle.code}</Badge>
                                            <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                        </div>
                                        {reading.closingReading !== null ? (
                                            <Badge variant="default" className="bg-green-500">
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-1 h-3 w-3" />
                                                Complete
                                            </Badge>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveNozzleClick(reading)}
                                                title="Remove Nozzle"
                                            >
                                                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Opening</p>
                                            <p className="font-medium">
                                                {parseFloat(reading.openingReading.toString()).toFixed(2)} L
                                            </p>
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
                                                            onUpdateTestQty(reading.id, val)
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
                                                            onUpdateClosingReading(reading.id, value)
                                                        }
                                                    }
                                                }}
                                            />
                                            <Button
                                                onClick={() => {
                                                    const input = document.getElementById(`closing-${reading.id}`) as HTMLInputElement
                                                    const value = parseFloat(input.value)
                                                    if (!isNaN(value)) {
                                                        onUpdateClosingReading(reading.id, value)
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
                                <CardTitle className="text-sm font-medium">Add Payment</CardTitle>
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
                                        <ComboboxInput placeholder="Select Method" />
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

                                {/* Manual amount for non-cash or when denominations disabled */}
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
                                        <Button variant="outline" className="flex-1" onClick={handleCancelEdit}>
                                            Cancel
                                        </Button>
                                    )}
                                    <Button
                                        className="flex-1"
                                        onClick={handleAddPayment}
                                    >
                                        {editingPaymentId ? "Update" : "Add"} Payment
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Payment History</p>

                            {/* Grouped Payment History */}
                            {(session.sessionPayments || [])
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
                                                            onDeletePayment(payment.id)
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
                                ))}
                            {(!session.sessionPayments || session.sessionPayments.length === 0) && (
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
                                    ₹{(session.sessionPayments?.reduce((sum: number, p: SessionPayment) => sum + parseFloat(p.amount.toString()), 0) || 0).toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={`${summary && summary.shortage < 0 ? 'bg-destructive/10 border-destructive/20' : summary && summary.shortage > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/50 border-muted-foreground/20'} h-12 flex flex-col justify-center overflow-hidden`}>
                            <CardContent className="p-1 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <p className="text-[10px] text-muted-foreground font-semibold leading-none mb-1">
                                        {summary && summary.shortage < 0 ? 'Shortage' : summary && summary.shortage > 0 ? 'Excess' : 'Status'}
                                    </p>
                                    <p className={`text-base font-bold leading-none ${summary && summary.shortage < 0 ? 'text-destructive' : summary && summary.shortage > 0 ? 'text-green-600' : ''}`}>
                                        {summary ? `₹${Math.abs(summary.shortage).toFixed(2)}` : '₹0.00'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="pt-6 border-t">
                        <Button className="w-full" size="lg" onClick={onFinishShift} disabled={isSubmitting}>
                            {isSubmitting ? "Finishing..." : "Finish Shift"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Add Nozzle Dialog */}
            <Dialog open={isAddNozzleOpen} onOpenChange={setIsAddNozzleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Nozzle to Shift</DialogTitle>
                        <DialogDescription>
                            Select a nozzle to add to your current shift.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Select Nozzle</Label>
                        <Select value={selectedNozzleToAdd} onValueChange={setSelectedNozzleToAdd}>
                            <SelectTrigger>
                                <SelectValue placeholder="Include Nozzle" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableNozzlesQuery.data?.map(nozzle => (
                                    <SelectItem key={nozzle.id} value={nozzle.id.toString()}>
                                        {nozzle.code} ({nozzle.fuel.name})
                                    </SelectItem>
                                ))}
                                {(!availableNozzlesQuery.data || availableNozzlesQuery.data.length === 0) && (
                                    <SelectItem value="none" disabled>No available nozzles</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddNozzleOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddNozzle} disabled={!selectedNozzleToAdd || addNozzleMutation.isPending}>
                            {addNozzleMutation.isPending ? "Adding..." : "Add Nozzle"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Nozzle Confirmation Dialog */}
            <Dialog open={isRemoveNozzleOpen} onOpenChange={setIsRemoveNozzleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Nozzle</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove nozzle {nozzleToRemove?.nozzle.code} from this shift?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-amber-50 rounded-md p-3 text-sm text-amber-800 border border-amber-200 my-2 flex gap-2">
                        <HugeiconsIcon icon={InformationCircleIcon} className="h-5 w-5 shrink-0" />
                        <p>This will remove the nozzle from your active shift and make it available for others. No sales data will be recorded for this nozzle.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRemoveNozzleOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmRemoveNozzle}
                            disabled={removeNozzleMutation.isPending}
                        >
                            {removeNozzleMutation.isPending ? "Removing..." : "Remove Nozzle"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
