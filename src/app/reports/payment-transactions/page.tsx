"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { IndianRupee } from "lucide-react"
import { HugeiconsIcon } from "@hugeicons/react"
import { FilterIcon } from "@hugeicons/core-free-icons"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { PaymentFilters } from "./components/PaymentFilters"

export default function PaymentTransactionsReport() {
    const [fromDate, setFromDate] = useState<Date | undefined>()
    const [toDate, setToDate] = useState<Date | undefined>()
    const [paymentMethodId, setPaymentMethodId] = useState<string>("all")
    const [attendantId, setAttendantId] = useState<string>("all")
    const [page, setPage] = useState(0)
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const limit = 50

    // Fetch filters data
    const paymentMethodsQuery = trpc.paymentMethod.getAll.useQuery()
    const attendantsQuery = trpc.user.getAll.useQuery({ role: 'Fuel Attendant' })

    // Fetch transactions
    const queryInput = {
        limit,
        offset: page * limit,
        startDate: fromDate,
        endDate: toDate,
        paymentMethodId: paymentMethodId !== "all" && paymentMethodId !== "customer_all" ? parseInt(paymentMethodId) : undefined,
        isCustomerPayment: paymentMethodId === "customer_all",
        userId: attendantId !== "all" ? parseInt(attendantId) : undefined,
    }

    const { data, isLoading } = trpc.payment.getTransactions.useQuery(queryInput)

    const handleFromDateChange = (date?: Date) => {
        setFromDate(date)
        setPage(0)
    }

    const handleToDateChange = (date?: Date) => {
        setToDate(date)
        setPage(0)
    }

    const handlePaymentMethodChange = (value: string) => {
        setPaymentMethodId(value)
        setPage(0)
    }

    const handleAttendantChange = (value: string) => {
        setAttendantId(value)
        setPage(0)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount)
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .filter(n => n)
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    // Check if any filter is active
    const activeFilterCount = [
        fromDate,
        toDate,
        paymentMethodId !== "all",
        attendantId !== "all"
    ].filter(Boolean).length

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold tracking-tight">Payment Transactions Report</h2>

                {/* Mobile Filter Toggle */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="md:hidden gap-2"
                >
                    <HugeiconsIcon icon={FilterIcon} className="h-4 w-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 flex items-center justify-center rounded-full text-[10px]">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>

                {/* Desktop Filters (Always Visible) */}
                <div className="hidden md:block">
                    <PaymentFilters
                        fromDate={fromDate}
                        setFromDate={handleFromDateChange}
                        toDate={toDate}
                        setToDate={handleToDateChange}
                        paymentMethodId={paymentMethodId}
                        setPaymentMethodId={handlePaymentMethodChange}
                        attendantId={attendantId}
                        setAttendantId={handleAttendantChange}
                        paymentMethods={paymentMethodsQuery.data || []}
                        attendants={attendantsQuery.data || []}
                        className="flex items-center gap-2"
                    />
                </div>
            </div>

            {/* Mobile Filters (Collapsible) */}
            {isFilterOpen && (
                <Card className="md:hidden">
                    <CardContent className="p-4">
                        <PaymentFilters
                            fromDate={fromDate}
                            setFromDate={handleFromDateChange}
                            toDate={toDate}
                            setToDate={handleToDateChange}
                            paymentMethodId={paymentMethodId}
                            setPaymentMethodId={handlePaymentMethodChange}
                            attendantId={attendantId}
                            setAttendantId={handleAttendantChange}
                            paymentMethods={paymentMethodsQuery.data || []}
                            attendants={attendantsQuery.data || []}
                            className="flex flex-col gap-4"
                        />
                    </CardContent>
                </Card>
            )}

            {/* Transactions Table (Desktop) */}
            <Card className="hidden md:block">
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Shift Type</TableHead>
                                <TableHead>Attendant</TableHead>
                                <TableHead>Payment Method</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Spinner className="size-6 mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : data?.transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No transactions found for the selected criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">
                                                    {format(new Date(tx.createdAt), "dd MMM yyyy")}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(tx.createdAt), "hh:mm a")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium">
                                                {tx.dutySession.type
                                                    ? (tx.dutySession.type.charAt(0) + tx.dutySession.type.slice(1).toLowerCase() + ' Shift')
                                                    : 'Shift'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar size="sm">
                                                    <AvatarFallback>{getInitials(tx.dutySession.user.name || tx.dutySession.user.username)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    {tx.dutySession.user.name || tx.dutySession.user.username}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {tx.paymentMethod.name}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-muted-foreground">
                                                {tx.quantity ? `${tx.quantity} L fuel` : ""}
                                                {tx.coinsAmount && Number(tx.coinsAmount) > 0 ? (
                                                    tx.quantity ? `, Coins: ${formatCurrency(Number(tx.coinsAmount))}` : `Coins: ${formatCurrency(Number(tx.coinsAmount))}`
                                                ) : ""}
                                                {!tx.quantity && !tx.coinsAmount && "-"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(Number(tx.amount))}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={5} className="font-bold text-right">Total Amount</TableCell>
                                <TableCell className="text-right font-bold">
                                    {isLoading ? <Spinner className="h-4 w-4 ml-auto" /> : formatCurrency(data?.summary.totalAmount || 0)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile View - Card List */}
            <div className="space-y-4 md:hidden">
                {/* Mobile Total Summary */}
                <Card className="bg-muted/50">
                    <CardContent className="p-4 flex justify-between items-center">
                        <span className="font-bold">Total Amount</span>
                        <span className="font-bold text-lg">
                            {isLoading ? <Spinner className="h-4 w-4" /> : formatCurrency(data?.summary.totalAmount || 0)}
                        </span>
                    </CardContent>
                </Card>

                {isLoading ? (
                    <div className="text-center py-10"><Spinner className="size-6 mx-auto" /></div>
                ) : data?.transactions.length === 0 ? (
                    <div className="text-center py-10">No transactions found.</div>
                ) : (
                    data?.transactions.map((tx) => (
                        <Card key={tx.id}>
                            <CardContent className="space-y-3 pt-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">
                                            {format(new Date(tx.createdAt), "dd MMM yyyy")}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(tx.createdAt), "hh:mm a")}
                                        </span>
                                    </div>
                                    <Badge variant="outline">
                                        {tx.paymentMethod.name}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">Shift:</div>
                                    <div>
                                        {tx.dutySession.type
                                            ? (tx.dutySession.type.charAt(0) + tx.dutySession.type.slice(1).toLowerCase() + ' Shift')
                                            : 'Shift'}
                                    </div>

                                    <div className="text-muted-foreground">Attendant:</div>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-5 w-5">
                                            <AvatarFallback className="text-[10px]">{getInitials(tx.dutySession.user.name || tx.dutySession.user.username)}</AvatarFallback>
                                        </Avatar>
                                        <span>{tx.dutySession.user.name || tx.dutySession.user.username}</span>
                                    </div>

                                    <div className="text-muted-foreground">Details:</div>
                                    <div>
                                        {tx.quantity ? `${tx.quantity} L fuel` : ""}
                                        {tx.coinsAmount && Number(tx.coinsAmount) > 0 ? (
                                            tx.quantity ? `, Coins: ${formatCurrency(Number(tx.coinsAmount))}` : `Coins: ${formatCurrency(Number(tx.coinsAmount))}`
                                        ) : ""}
                                        {!tx.quantity && !tx.coinsAmount && "-"}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t mt-2">
                                    <span className="text-sm font-medium text-muted-foreground">Amount</span>
                                    <span className="text-lg font-bold">{formatCurrency(Number(tx.amount))}</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data || (page + 1) * limit >= data.pagination.total || isLoading}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
