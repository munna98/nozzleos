"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Coins, CreditCard, BookOpenCheck, Trophy, User } from "lucide-react"

interface PaymentSummaryCardsProps {
    summary: {
        totalAmount: number
        totalCount: number
        standardTotal: number
        standardCount: number
        customerTotal: number
        customerCount: number
        byMethod: Array<{
            paymentMethodId: number
            name: string
            isCustomer: boolean
            amount: number
            count: number
            percentage: number
        }>
        byAttendant: Array<{
            id: number
            name: string
            username: string
            amount: number
            count: number
            percentage: number
        }>
    }
}

export function PaymentSummaryCards({ summary }: PaymentSummaryCardsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2,
        }).format(amount)
    }

    const topMethod = summary.byMethod.length > 0 ? summary.byMethod[0] : null

    return (
        <div className="space-y-6">
            {/* KPI Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Collection */}
                <Card className="relative overflow-hidden border-l-4 border-l-primary shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Collection</p>
                            <p className="text-2xl font-bold tracking-tight">{formatCurrency(summary.totalAmount)}</p>
                            <p className="text-xs text-muted-foreground">{summary.totalCount} total transactions</p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <Coins className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* Standard Payments */}
                <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Standard Payments</p>
                            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(summary.standardTotal)}
                            </p>
                            <p className="text-xs text-muted-foreground">{summary.standardCount} transactions</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400">
                            <CreditCard className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* Customer Payments */}
                <Card className="relative overflow-hidden border-l-4 border-l-amber-500 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer Payments</p>
                            <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                                {formatCurrency(summary.customerTotal)}
                            </p>
                            <p className="text-xs text-muted-foreground">{summary.customerCount} transactions</p>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400">
                            <BookOpenCheck className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* Top Payment Method */}
                <Card className="relative overflow-hidden border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Top Method</p>
                            <p className="text-xl font-bold tracking-tight truncate max-w-[140px]" title={topMethod?.name || 'N/A'}>
                                {topMethod ? topMethod.name : 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {topMethod ? `${formatCurrency(topMethod.amount)} (${topMethod.percentage.toFixed(1)}%)` : 'No transactions'}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-full text-blue-600 dark:text-blue-400">
                            <Trophy className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Breakdown Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment Method Breakdown */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-primary" />
                                    Breakdown by Payment Method
                                </CardTitle>
                                <CardDescription>Collection split across standard and customer methods</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {summary.byMethod.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">
                                No payment methods recorded for this range.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead className="text-center">Type</TableHead>
                                        <TableHead className="text-center">Count</TableHead>
                                        <TableHead className="text-right">Share</TableHead>
                                        <TableHead className="text-right">Total Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.byMethod.map((item) => (
                                        <TableRow key={item.paymentMethodId} className="hover:bg-muted/20">
                                            <TableCell className="font-medium">
                                                <div className="space-y-1">
                                                    <span>{item.name}</span>
                                                    <Progress value={item.percentage} className="h-1.5 w-full bg-muted" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {item.isCustomer ? (
                                                    <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                                                        Customer
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                                        Standard
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-medium">
                                                {item.count}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-semibold text-muted-foreground">
                                                {item.percentage.toFixed(1)}%
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {formatCurrency(item.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Attendant Breakdown */}
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    Breakdown by Fuel Attendant
                                </CardTitle>
                                <CardDescription>Collections logged per staff member</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {summary.byAttendant.length === 0 ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">
                                No attendant data recorded for this range.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>Attendant</TableHead>
                                        <TableHead className="text-center">Txns</TableHead>
                                        <TableHead className="text-right">Share</TableHead>
                                        <TableHead className="text-right">Total Collected</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summary.byAttendant.map((att) => (
                                        <TableRow key={att.id} className="hover:bg-muted/20">
                                            <TableCell className="font-medium">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{att.name}</span>
                                                        {att.username !== att.name && (
                                                            <span className="text-xs text-muted-foreground">(@{att.username})</span>
                                                        )}
                                                    </div>
                                                    <Progress value={att.percentage} className="h-1.5 w-full bg-muted" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-medium">
                                                {att.count}
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-semibold text-muted-foreground">
                                                {att.percentage.toFixed(1)}%
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                {formatCurrency(att.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
