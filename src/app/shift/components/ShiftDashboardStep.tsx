"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    CheckmarkCircle02Icon,
    FuelStationIcon,
    MoneyReceive01Icon,
    TimeQuarterPassIcon,
    PencilEdit01Icon,
    Delete02Icon
} from "@hugeicons/core-free-icons"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/server/trpc/router"

type RouterOutputs = inferRouterOutputs<AppRouter>
type ShiftSession = NonNullable<RouterOutputs['shift']['getActive']>
type PaymentMethod = RouterOutputs['paymentMethod']['getAll'][number]
type NozzleReading = ShiftSession['nozzleReadings'][number]
type SessionPayment = NonNullable<ShiftSession['sessionPayments']>[number]
type Denomination = RouterOutputs['denomination']['getAll'][number]
type Settings = RouterOutputs['settings']['get']

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
    onAddPayment: (data: PaymentData) => void
    onDeletePayment: (paymentId: number) => void
    onFinishShift: () => void
    isSubmitting?: boolean
}

export function ShiftDashboardStep({
    session,
    elapsedTime,
    paymentMethods,
    denominations = [],
    settings,
    onUpdateClosingReading,
    onAddPayment,
    onDeletePayment,
    onFinishShift,
    isSubmitting
}: ShiftDashboardStepProps) {
    const [selectedMethodId, setSelectedMethodId] = useState("")
    const [manualAmount, setManualAmount] = useState("")
    const [denominationCounts, setDenominationCounts] = useState<Record<number, number>>({})
    const [coinsAmount, setCoinsAmount] = useState("")
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)

    // Check if selected method is Cash and denomination entry is enabled
    const selectedMethod = paymentMethods.find(pm => pm.id.toString() === selectedMethodId)
    const isCashPayment = selectedMethod?.name?.toLowerCase() === 'cash'
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
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <HugeiconsIcon icon={FuelStationIcon} />
                        Nozzle Readings
                    </h3>
                    {session.nozzleReadings.map((reading: NozzleReading) => (
                        <Card key={reading.id}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge>{reading.nozzle.code}</Badge>
                                        <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                    </div>
                                    {reading.closingReading !== null && (
                                        <Badge variant="default" className="bg-green-500">
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-1 h-3 w-3" />
                                            Complete
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Opening</p>
                                        <p className="font-medium">
                                            {parseFloat(reading.openingReading.toString()).toFixed(2)} L
                                        </p>
                                    </div>
                                    {Number(reading.testQty) > 0 && (
                                        <div>
                                            <p className="text-muted-foreground">Test Qty</p>
                                            <p className="font-medium">
                                                {parseFloat(reading.testQty.toString()).toFixed(2)} L
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
                                    <select
                                        className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={selectedMethodId}
                                        onChange={(e) => setSelectedMethodId(e.target.value)}
                                    >
                                        <option value="">Select Method</option>
                                        {paymentMethods.map((pm: PaymentMethod) => (
                                            <option key={pm.id} value={pm.id}>{pm.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Denomination Grid for Cash */}
                                {showDenominations && (
                                    <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {denominations.map((denom) => (
                                                <div key={denom.id} className="flex items-center justify-between p-3 rounded-lg border bg-card shadow-sm">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-lg">{denom.label}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            = ₹{((denominationCounts[denom.id] || 0) * denom.value).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-muted-foreground text-sm">×</span>
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            min="0"
                                                            className="w-24 h-12 text-center text-lg font-medium"
                                                            value={denominationCounts[denom.id] || ""}
                                                            onChange={(e) => handleDenominationChange(denom.id, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </div>
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
                                                        className="flex-1 h-8"
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
                                    <Button className="flex-1" onClick={handleAddPayment}>
                                        {editingPaymentId ? "Update" : "Add"} Payment
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Payment History</p>
                            {session.sessionPayments?.map((payment: SessionPayment) => (
                                <Card key={payment.id} className="relative overflow-hidden">
                                    <CardContent className="py-0 px-3 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{payment.paymentMethod.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(payment.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-bold text-lg">₹{payment.amount.toString()}</p>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPayment(payment)}>
                                                    <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDeletePayment(payment.id)}>
                                                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {(!session.sessionPayments || session.sessionPayments.length === 0) && (
                                <p className="text-center text-muted-foreground text-sm py-4">
                                    No payments recorded yet.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Total Amount */}
                    <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6">
                            <p className="text-3xl font-bold text-primary text-center">
                                ₹{(session.sessionPayments?.reduce((sum: number, p: SessionPayment) => sum + parseFloat(p.amount.toString()), 0) || 0).toFixed(2)}
                            </p>
                        </CardContent>
                    </Card>

                    <div className="pt-6 border-t">
                        <Button className="w-full" size="lg" onClick={onFinishShift} disabled={isSubmitting}>
                            {isSubmitting ? "Finishing..." : "Finish Shift"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
