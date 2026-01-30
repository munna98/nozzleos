import { useState } from "react"
import { DatePicker } from "@/components/ui/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

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
    const [isCustom, setIsCustom] = useState(false)

    // Determine valid preset based on current dates
    const getPresetValue = () => {
        if (isCustom) return 'custom'

        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const thisWeekStart = new Date(today)
        // Adjust to Monday (1) or Sunday (0). Let's assume Monday is start of week.
        const day = thisWeekStart.getDay()
        const diff = thisWeekStart.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
        thisWeekStart.setDate(diff)

        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

        if (fromDate && toDate) {
            const from = fromDate
            const to = toDate

            if (from.toDateString() === today.toDateString() && to.toDateString() === today.toDateString()) {
                return 'today'
            }
            if (from.toDateString() === yesterday.toDateString() && to.toDateString() === yesterday.toDateString()) {
                return 'yesterday'
            }
            // Check for This Week (from start of week to today)
            // Or usually "This Week" is start of week to end of week?
            // User likely wants "transactions for this week so far" or "all this week".
            // Let's set ToDate to Today for "This Week" and "This Month" as it makes sense for reporting "current progress".
            // Actually, for a *filter*, "This Month" usually implies the whole month range or from 1st to Today.
            // Let's stick to 1st to Today.
            if (from.toDateString() === thisWeekStart.toDateString() && to.toDateString() === today.toDateString()) {
                return 'this_week'
            }
            if (from.toDateString() === thisMonthStart.toDateString() && to.toDateString() === today.toDateString()) {
                return 'this_month'
            }
        }
        return 'custom'
    }

    const handlePresetChange = (value: string) => {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const thisWeekStart = new Date(today)
        const day = thisWeekStart.getDay()
        const diff = thisWeekStart.getDate() - day + (day === 0 ? -6 : 1)
        thisWeekStart.setDate(diff)

        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

        if (value === 'custom') {
            setIsCustom(true)
            return
        }

        setIsCustom(false)

        if (value === 'today') {
            setFromDate(today)
            setToDate(today)
        } else if (value === 'yesterday') {
            setFromDate(yesterday)
            setToDate(yesterday)
        } else if (value === 'this_week') {
            setFromDate(thisWeekStart)
            setToDate(today)
        } else if (value === 'this_month') {
            setFromDate(thisMonthStart)
            setToDate(today)
        }
    }

    const preset = getPresetValue()

    const methodOptions = [
        { id: "all", name: "All Methods" },
        { id: "standard_all", name: "All Standard Methods" },
        { id: "customer_all", name: "All Customer Methods" },
        ...paymentMethods.map(m => ({ id: m.id.toString(), name: m.name }))
    ]

    const selectedMethod = methodOptions.find(m => m.id === paymentMethodId)

    return (
        <div className={className}>
            {/* Date Range Preset */}
            <div className="w-full md:w-auto">
                <Select value={preset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-full md:w-[130px]">
                        <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="this_week">This Week</SelectItem>
                        <SelectItem value="this_month">This Month</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Date Pickers (only show if Custom) */}
            {preset === 'custom' && (
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
            )}

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
            <div className="w-full md:w-[220px]">
                <Combobox
                    items={methodOptions}
                    value={selectedMethod || null}
                    onValueChange={(val: any) => setPaymentMethodId(val?.id ?? "all")}
                    itemToStringLabel={(item: any) => item?.name ?? ""}
                >
                    <ComboboxInput placeholder="Select Method" className="w-full" />
                    <ComboboxContent>
                        <ComboboxEmpty>No methods found.</ComboboxEmpty>
                        <ComboboxList>
                            {(item: any) => (
                                <ComboboxItem key={item.id} value={item}>
                                    {item.name}
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </div>
        </div>
    )
}
