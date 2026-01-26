
import { DatePicker } from "@/components/ui/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface PaymentFiltersProps {
    fromDate: Date | undefined
    setFromDate: (date: Date | undefined) => void
    toDate: Date | undefined
    setToDate: (date: Date | undefined) => void
    paymentMethodId: string
    setPaymentMethodId: (val: string) => void
    attendantId: string
    setAttendantId: (val: string) => void
    paymentMethods: any[]
    attendants: any[]
    className?: string
}

export function PaymentFilters({
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    paymentMethodId,
    setPaymentMethodId,
    attendantId,
    setAttendantId,
    paymentMethods,
    attendants,
    className
}: PaymentFiltersProps) {
    return (
        <div className={className}>
            {/* Date Pickers */}
            {/* Date Pickers */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex-1">
                    <DatePicker
                        date={fromDate}
                        setDate={setFromDate}
                        placeholder="From"
                        className="w-full md:w-[140px]"
                    />
                </div>
                <span className="text-muted-foreground shrink-0">-</span>
                <div className="flex-1">
                    <DatePicker
                        date={toDate}
                        setDate={setToDate}
                        placeholder="To"
                        className="w-full md:w-[140px]"
                    />
                </div>
            </div>

            {/* Attendant Filter */}
            <Select value={attendantId} onValueChange={setAttendantId}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="All Attendants" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Attendants</SelectItem>
                    {attendants.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name || user.username}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="All Payment Methods" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="customer_all">All Customer Methods</SelectItem>
                    {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id.toString()}>
                            {method.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
