"use client"

import { useState, Fragment } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { FuelStationIcon, MoneyReceive01Icon, ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/server/trpc/router"
import { useMemo } from "react"


type RouterOutputs = inferRouterOutputs<AppRouter>
type ShiftSummary = NonNullable<RouterOutputs['shift']['getSummary']>
type SummaryNozzleReading = ShiftSummary['nozzleReadings'][number]
type SummaryPayment = ShiftSummary['sessionPayments'][number]

interface PaymentMethodSummary {
    methodId: number
    methodName: string
    totalAmount: number
    count: number
    payments: SummaryPayment[]
}

interface ShiftSummaryStepProps {
    summary: ShiftSummary
    onBack: () => void
    onSubmit: (notes: string) => void
    isSubmitting: boolean
}

export function ShiftSummaryStep({
    summary,
    onBack,
    onSubmit,
    isSubmitting
}: ShiftSummaryStepProps) {
    const [closingNotes, setClosingNotes] = useState("")
    const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null)
    const [expandedGroupIds, setExpandedGroupIds] = useState<number[]>([])

    // Calculate method totals
    const methodSummaries = useMemo(() => {
        const summaries: Record<number, PaymentMethodSummary> = {}

        summary.sessionPayments.forEach(payment => {
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
    }, [summary.sessionPayments])

    const toggleGroup = (methodId: number) => {
        setExpandedGroupIds(prev =>
            prev.includes(methodId)
                ? prev.filter(id => id !== methodId)
                : [...prev, methodId]
        )
    }



    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Shift Summary</CardTitle>
                    <CardDescription>Review details before submitting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-muted-foreground mb-1">Total Fuel Sales</p>
                                <p className="text-2xl font-bold">₹{summary.totalFuelSales.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-muted-foreground mb-1">Total Collected</p>
                                <p className="text-2xl font-bold">₹{summary.totalCollected.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <p className="text-muted-foreground mb-1">Shortage / Excess</p>
                                <p className={`text-2xl font-bold ${summary.shortage > 0 ? 'text-green-600' : summary.shortage < 0 ? 'text-red-600' : ''}`}>
                                    {summary.shortage > 0 ? '+' : summary.shortage < 0 ? '-' : ''}₹{Math.abs(summary.shortage).toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Separator />

                    {/* Nozzle-wise Breakdown */}
                    <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <HugeiconsIcon icon={FuelStationIcon} className="h-4 w-4" />
                            Fuel Sales Breakdown
                        </h3>

                        {/* Desktop View (Table) */}
                        <div className="hidden md:block rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-3 font-medium">Nozzle</th>
                                        <th className="text-left p-3 font-medium">Fuel</th>
                                        <th className="text-right p-3 font-medium">Test Qty</th>
                                        <th className="text-right p-3 font-medium">Qty (L)</th>
                                        <th className="text-right p-3 font-medium">Rate</th>
                                        <th className="text-right p-3 font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.nozzleReadings.map((reading: SummaryNozzleReading) => (
                                        <tr key={reading.id} className="border-t">
                                            <td className="p-3">
                                                <Badge variant="outline">{reading.nozzle.code}</Badge>
                                            </td>
                                            <td className="p-3">{reading.nozzle.fuel.name}</td>
                                            <td className="p-3 text-right text-muted-foreground">
                                                {parseFloat(reading.testQty?.toString() || '0').toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                {parseFloat(reading.fuelDispensed?.toString() || '0').toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground">
                                                ₹{parseFloat(String(reading.price)).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                ₹{parseFloat(String(reading.amount)).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="border-t bg-muted/30 font-medium">
                                        <td colSpan={5} className="p-3 text-right">Total Fuel Sales</td>
                                        <td className="p-3 text-right">₹{summary.totalFuelSales.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View (Cards) */}
                        <div className="md:hidden space-y-3">
                            {summary.nozzleReadings.map((reading: SummaryNozzleReading) => (
                                <Card key={reading.id}>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{reading.nozzle.code}</Badge>
                                                <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                            </div>
                                            <div className="font-bold">
                                                ₹{parseFloat(String(reading.amount)).toFixed(2)}
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Test Qty</p>
                                                <p>{parseFloat(reading.testQty?.toString() || '0').toFixed(2)}</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-xs text-muted-foreground mb-1">Rate</p>
                                                <p>₹{parseFloat(String(reading.price)).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-muted-foreground mb-1">Net Qty</p>
                                                <p className="font-medium">{parseFloat(reading.fuelDispensed?.toString() || '0').toFixed(2)} L</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            <Card className="bg-muted/30">
                                <CardContent className="p-4 flex justify-between items-center font-bold">
                                    <span>Total Fuel Sales</span>
                                    <span>₹{summary.totalFuelSales.toFixed(2)}</span>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Payment-wise Breakdown */}
                    <div className="space-y-3">
                        <h3 className="font-semibold flex items-center gap-2">
                            <HugeiconsIcon icon={MoneyReceive01Icon} className="h-4 w-4" />
                            Payments Breakdown
                        </h3>
                        <div className="rounded-md border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-3 font-medium cursor-pointer" style={{ width: "60%" }}>Payment Method</th>
                                        <th className="text-right p-3 font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.values(methodSummaries)
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
                                                                <Badge variant="secondary" className="text-xs h-5 px-1.5 font-normal focus:ring-0">
                                                                    {summary.count}
                                                                </Badge>
                                                            )}
                                                            {summary.count === 1 && summary.payments[0]?.denominations?.length > 0 && (
                                                                <span className="text-[10px] text-muted-foreground font-medium ml-auto sm:ml-2">
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

                                                                                {/* Denomination Details for multi-entry payments */}
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
                                        ))}
                                    {summary.sessionPayments.length === 0 && (
                                        <tr className="border-t">
                                            <td colSpan={2} className="p-3 text-center text-muted-foreground">No payments recorded</td>
                                        </tr>
                                    )}
                                    <tr className="border-t bg-muted/30 font-medium">
                                        <td className="p-3 text-right">Total Collected</td>
                                        <td className="p-3 text-right">₹{summary.totalCollected.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>



                    <Separator />

                    <div className="space-y-2">
                        <Label>Closing Notes (Optional)</Label>
                        <Textarea
                            value={closingNotes}
                            onChange={(e) => setClosingNotes(e.target.value)}
                            placeholder="Enter any notes about this shift..."
                        />
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" onClick={onBack}>
                            Back to Editing
                        </Button>
                        <Button className="flex-1" onClick={() => onSubmit(closingNotes)} disabled={isSubmitting}>
                            {isSubmitting ? "Submitting..." : "Submit Shift"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
