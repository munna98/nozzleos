"use client"

import { useState, useEffect } from "react"
import { ShiftType } from "@prisma/client"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import { FilterIcon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { DatePicker } from "@/components/ui/date-picker"

export interface ShiftFiltersState {
    shiftType?: ShiftType
    startDateFrom?: Date
    startDateTo?: Date
    userNameSearch?: string
    status?: string
    userId?: number
}

interface ShiftFiltersProps {
    filters: ShiftFiltersState
    onFiltersChange: (filters: ShiftFiltersState) => void
    isAdmin: boolean
    isOpen?: boolean
    onOpenChange?: (open: boolean) => void
    className?: string
}

export function ShiftFilters({
    filters,
    onFiltersChange,
    isAdmin,
    isOpen = false,
    onOpenChange,
    className,
}: ShiftFiltersProps) {
    const attendantsQuery = trpc.user.getAll.useQuery(
        { role: 'Fuel Attendant' },
        { enabled: isAdmin }
    )

    const attendants = attendantsQuery.data || []

    const handleClearFilters = () => {
        onFiltersChange({})
        onOpenChange?.(false)
    }

    const handleFilterChange = (updates: Partial<ShiftFiltersState>) => {
        onFiltersChange({
            ...filters,
            ...updates
        })
    }

    const [isCustom, setIsCustom] = useState(false)

    const handleDateChange = (field: 'startDateFrom' | 'startDateTo', date?: Date) => {
        handleFilterChange({ [field]: date })
    }

    // Determine valid preset based on current dates
    const getPresetValue = () => {
        if (isCustom) return 'custom'

        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        const thisWeekStart = new Date(today)
        const day = thisWeekStart.getDay()
        const diff = thisWeekStart.getDate() - day + (day === 0 ? -6 : 1)
        thisWeekStart.setDate(diff)

        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

        if (filters.startDateFrom && filters.startDateTo) {
            const from = new Date(filters.startDateFrom)
            const to = new Date(filters.startDateTo)

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
            onFiltersChange({
                ...filters,
                startDateFrom: today,
                startDateTo: today
            })
        } else if (value === 'yesterday') {
            onFiltersChange({
                ...filters,
                startDateFrom: yesterday,
                startDateTo: yesterday
            })
        } else if (value === 'this_week') {
            onFiltersChange({
                ...filters,
                startDateFrom: thisWeekStart,
                startDateTo: today
            })
        } else if (value === 'this_month') {
            onFiltersChange({
                ...filters,
                startDateFrom: thisMonthStart,
                startDateTo: today
            })
        } else {
            // Custom: keep existing dates (allows user to edit)
        }
    }

    const preset = getPresetValue()

    const hasActiveFilters = Object.keys(filters).length > 0

    return (
        <div className={className}>
            {/* Date Range Preset */}
            <div className="w-full md:w-auto">
                <Select value={preset} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-full md:w-[130px] h-8">
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
                            date={filters.startDateFrom}
                            setDate={(date) => handleDateChange('startDateFrom', date)}
                            className="w-full md:w-[130px] h-8 text-xs"
                            placeholder="From"
                        />
                    </div>
                    <span className="text-muted-foreground shrink-0">-</span>
                    <div className="flex-1">
                        <DatePicker
                            date={filters.startDateTo}
                            setDate={(date) => handleDateChange('startDateTo', date)}
                            className="w-full md:w-[130px] h-8 text-xs"
                            placeholder="To"
                        />
                    </div>
                </div>
            )}

            {/* Shift Type Filter */}
            <Select
                value={filters.shiftType || 'all'}
                onValueChange={(value) =>
                    handleFilterChange({
                        shiftType: value === 'all' ? undefined : (value as ShiftType)
                    })
                }
            >
                <SelectTrigger id="shift-type" className="w-full md:w-[140px] h-8">
                    <SelectValue placeholder="All Shift Types" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Shift Types</SelectItem>
                    <SelectItem value="MORNING">Morning</SelectItem>
                    <SelectItem value="EVENING">Evening</SelectItem>
                    <SelectItem value="NIGHT">Night</SelectItem>
                </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                    handleFilterChange({
                        status: value === 'all' ? undefined : value
                    })
                }
            >
                <SelectTrigger className="w-full md:w-[140px] h-8">
                    <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending_verification">Pending Review</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>

            {/* Admin-only: Attendant Select */}
            {isAdmin && (
                <Select
                    value={filters.userId ? filters.userId.toString() : 'all'}
                    onValueChange={(value) =>
                        handleFilterChange({
                            userId: value === 'all' ? undefined : parseInt(value)
                        })
                    }
                >
                    <SelectTrigger className="w-full md:w-[160px] h-8">
                        <SelectValue placeholder="All Attendants" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Attendants</SelectItem>
                        {attendantsQuery.isLoading ? (
                            <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                        ) : (
                            attendants.map((attendant) => (
                                <SelectItem key={attendant.id} value={attendant.id.toString()}>
                                    {attendant.name || attendant.username}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            )}

            {/* Clear Filters (Desktop Inline) */}
            {Object.keys(filters).length > 0 && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFilters}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Clear Filters"
                >
                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
