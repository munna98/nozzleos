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
    shiftType,
    setShiftType,
    userId,
    setUserId,
    users,
    className
}: StaffReportFiltersProps) {
    return (
        <div className={className}>
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
