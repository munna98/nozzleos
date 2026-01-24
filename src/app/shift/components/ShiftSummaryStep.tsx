"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { FuelStationIcon, MoneyReceive01Icon } from "@hugeicons/core-free-icons"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/server/trpc/router"
import { useMemo } from "react"


type RouterOutputs = inferRouterOutputs<AppRouter>
type ShiftSummary = NonNullable<RouterOutputs['shift']['getSummary']>
type SummaryNozzleReading = ShiftSummary['nozzleReadings'][number]
type SummaryPayment = ShiftSummary['sessionPayments'][number]

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

    // Calculate aggregated denominations
    const denominationCommons = useMemo(() => {
        const counts: Record<string, { count: number, value: number, label: string }> = {}
        let totalCoins = 0

        summary.sessionPayments.forEach((payment: any) => {
            // Aggregate coins
            if (payment.coinsAmount) {
                totalCoins += Number(payment.coinsAmount)
            }

            // Aggregate denominations
            if (payment.denominations) {
                payment.denominations.forEach((d: any) => {
                    const key = d.denominationId.toString()
                    if (!counts[key]) {
                        counts[key] = {
                            count: 0,
                            value: d.denomination.value,
                            label: d.denomination.label
                        }
                    }
                    counts[key].count += d.count
                })
            }
        })

        // Filter out zero counts and sort by value descending
        const sortedDenoms = Object.values(counts)
            .filter(d => d.count > 0)
            .sort((a, b) => b.value - a.value)

        return {
            denominations: sortedDenoms,
            totalCoins,
            hasData: sortedDenoms.length > 0 || totalCoins > 0
        }
    }, [summary.sessionPayments])


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
                                        <th className="text-left p-3 font-medium">Payment Method</th>
                                        <th className="text-right p-3 font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.sessionPayments.map((payment: SummaryPayment) => (
                                        <tr key={payment.id} className="border-t">
                                            <td className="p-3">{payment.paymentMethod.name}</td>
                                            <td className="p-3 text-right font-medium">₹{parseFloat(payment.amount.toString()).toFixed(2)}</td>
                                        </tr>
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

                    {/* Total Cash Breakdown */}
                    {denominationCommons.hasData && (
                        <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2">
                                <HugeiconsIcon icon={MoneyReceive01Icon} className="h-4 w-4" />
                                Total Cash Breakdown
                            </h3>
                            <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3 font-medium">Denomination</th>
                                            <th className="text-center p-3 font-medium">Count</th>
                                            <th className="text-right p-3 font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {denominationCommons.denominations.map((d) => (
                                            <tr key={d.label} className="border-t hover:bg-muted/50 transition-colors">
                                                <td className="p-3">{d.label}</td>
                                                <td className="p-3 text-center">{d.count}</td>
                                                <td className="p-3 text-right font-medium">
                                                    ₹{(d.count * d.value).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}

                                        {denominationCommons.totalCoins > 0 && (
                                            <tr className="border-t hover:bg-muted/50 transition-colors">
                                                <td className="p-3">Coins</td>
                                                <td className="p-3 text-center">-</td>
                                                <td className="p-3 text-right font-medium">
                                                    ₹{denominationCommons.totalCoins.toLocaleString()}
                                                </td>
                                            </tr>
                                        )}

                                        <tr className="border-t bg-muted/30 font-medium">
                                            <td colSpan={2} className="p-3 text-right">Total Cash</td>
                                            <td className="p-3 text-right">
                                                ₹{(
                                                    denominationCommons.denominations.reduce((acc, curr) => acc + (curr.count * curr.value), 0) +
                                                    denominationCommons.totalCoins
                                                ).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}


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
