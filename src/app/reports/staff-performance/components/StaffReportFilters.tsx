import { useState } from "react"
import { DatePicker } from "@/components/ui/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ShiftType } from "@prisma/client"

interface StaffReportFiltersProps {
    fromDate?: Date
    setFromDate: (date?: Date) => void
    toDate?: Date
    setToDate: (date?: Date) => void
    datePreset: string
    setDatePreset: (val: string) => void
    shiftType: string
    setShiftType: (type: string) => void
    userId: string
    setUserId: (id: string) => void
    users: Array<{ id: number; name: string | null; username: string }>
    className?: string
}

export function StaffReportFilters({
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    datePreset,
    setDatePreset,
    shiftType,
    setShiftType,
    userId,
    setUserId,
    users,
    className
}: StaffReportFiltersProps) {
    const [isCustom, setIsCustom] = useState(false)

    // Determine valid preset based on current dates
    const getPresetValue = () => {
        if (isCustom || datePreset === 'custom') return 'custom'

        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const thisWeekStart = new Date(today)
        const day = thisWeekStart.getDay()
        const diff = thisWeekStart.getDate() - day + (day === 0 ? -6 : 1)
        thisWeekStart.setDate(diff)

        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

        if (fromDate && toDate) {
            const from = fromDate
            const to = toDate

            // Priorities explicit preset if it matches the current dates
            if (datePreset === 'today' && from.toDateString() === today.toDateString() && to.toDateString() === today.toDateString()) return 'today'
            if (datePreset === 'yesterday' && from.toDateString() === yesterday.toDateString() && to.toDateString() === yesterday.toDateString()) return 'yesterday'
            if (datePreset === 'this_week' && from.toDateString() === thisWeekStart.toDateString() && to.toDateString() === today.toDateString()) return 'this_week'
            if (datePreset === 'this_month' && from.toDateString() === thisMonthStart.toDateString() && to.toDateString() === today.toDateString()) return 'this_month'
            if (datePreset === 'last_month' && from.toDateString() === lastMonthStart.toDateString() && to.toDateString() === lastMonthEnd.toDateString()) return 'last_month'

            // Fallback to date check
            if (from.toDateString() === today.toDateString() && to.toDateString() === today.toDateString()) {
                return 'today'
            }
            if (from.toDateString() === yesterday.toDateString() && to.toDateString() === yesterday.toDateString()) {
                return 'yesterday'
            }
            if (from.toDateString() === thisWeekStart.toDateString() && to.toDateString() === today.toDateString()) {
                return 'this_week'
            }
            if (from.toDateString() === thisMonthStart.toDateString() && to.toDateString() === today.toDateString()) {
                return 'this_month'
            }
            if (from.toDateString() === lastMonthStart.toDateString() && to.toDateString() === lastMonthEnd.toDateString()) {
                return 'last_month'
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
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)

        setDatePreset(value)

        if (value === 'custom') {
            setIsCustom(true)
            return
        }

        setIsCustom(false)

        if (value === 'today') {
            today.setHours(0, 0, 0, 0)
            setFromDate(today)
            setToDate(today)
        } else if (value === 'yesterday') {
            yesterday.setHours(0, 0, 0, 0)
            setFromDate(yesterday)
            setToDate(yesterday)
        } else if (value === 'this_week') {
            thisWeekStart.setHours(0, 0, 0, 0)
            today.setHours(0, 0, 0, 0)
            setFromDate(thisWeekStart)
            setToDate(today)
        } else if (value === 'this_month') {
            thisMonthStart.setHours(0, 0, 0, 0)
            today.setHours(0, 0, 0, 0)
            setFromDate(thisMonthStart)
            setToDate(today)
        } else if (value === 'last_month') {
            lastMonthStart.setHours(0, 0, 0, 0)
            lastMonthEnd.setHours(0, 0, 0, 0)
            setFromDate(lastMonthStart)
            setToDate(lastMonthEnd)
        }
    }

    const preset = getPresetValue()

    return (
        <div className={className}>
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
                        <SelectItem value="last_month">Last Month</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {preset === 'custom' && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <DatePicker
                        date={fromDate}
                        setDate={setFromDate}
                        placeholder="From Date"
                        className="w-full md:w-[180px]"
                    />
                    <DatePicker
                        date={toDate}
                        setDate={setToDate}
                        placeholder="To Date"
                        className="w-full md:w-[180px]"
                    />
                </div>
            )}
            <Select value={shiftType} onValueChange={setShiftType}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Shift Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    <SelectItem value={ShiftType.MORNING}>Morning</SelectItem>
                    <SelectItem value={ShiftType.EVENING}>Evening</SelectItem>
                    <SelectItem value={ShiftType.NIGHT}>Night</SelectItem>
                </SelectContent>
            </Select>
            <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Staff Member" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name || user.username}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
