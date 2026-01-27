"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
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
import { FilterIcon, UserCircleIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons"

import { PaymentFilters } from "./components/PaymentFilters"

export default function PaymentTransactionsReport() {
    const router = useRouter()
    const [fromDate, setFromDate] = useState<Date | undefined>(new Date())
    const [toDate, setToDate] = useState<Date | undefined>(new Date())
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
        paymentMethodId: paymentMethodId !== "all" && paymentMethodId !== "customer_all" && paymentMethodId !== "standard_all" ? parseInt(paymentMethodId) : undefined,
        isCustomerPayment: paymentMethodId === "customer_all" ? true : (paymentMethodId === "standard_all" ? false : undefined),
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
            {/* Header with Back Button and Filter Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                        <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">Payments Report</h2>
                </div>

                {/* Mobile Filter Toggle */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="md:hidden relative"
                >
                    <HugeiconsIcon icon={FilterIcon} className="h-5 w-5" />
                    {activeFilterCount > 0 && (
                        <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px] bg-primary text-primary-foreground border-2 border-background">
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
                                <TableHead>Payment Method</TableHead>
                                <TableHead>Attendant</TableHead>
                                <TableHead>Shift Type</TableHead>
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
                                            {tx.paymentMethod.name}
                                        </TableCell>
                                        <TableCell>
                                            {tx.dutySession.user.name || tx.dutySession.user.username}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {tx.dutySession.type
                                                    ? (tx.dutySession.type.charAt(0) + tx.dutySession.type.slice(1).toLowerCase())
                                                    : 'Shift'}
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
                            <CardContent className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg">
                                            {formatCurrency(Number(tx.amount))}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(tx.createdAt), "dd MMM yyyy • hh:mm a")}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-medium text-sm">
                                            {tx.paymentMethod.name}
                                        </span>
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                            {tx.dutySession.type
                                                ? (tx.dutySession.type.charAt(0) + tx.dutySession.type.slice(1).toLowerCase())
                                                : 'Shift'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm border-t pt-3">
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                        <HugeiconsIcon icon={UserCircleIcon} className="h-4 w-4" />
                                        <span>{tx.dutySession.user.name || tx.dutySession.user.username}</span>
                                    </div>

                                    {(tx.quantity || (tx.coinsAmount && Number(tx.coinsAmount) > 0)) && (
                                        <div className="text-xs text-muted-foreground text-right">
                                            {tx.quantity ? `${tx.quantity} L fuel` : ""}
                                            {tx.coinsAmount && Number(tx.coinsAmount) > 0 ? (
                                                tx.quantity ? `, Coins: ${formatCurrency(Number(tx.coinsAmount))}` : `Coins: ${formatCurrency(Number(tx.coinsAmount))}`
                                            ) : ""}
                                        </div>
                                    )}
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
