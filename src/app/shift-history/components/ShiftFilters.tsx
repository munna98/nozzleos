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
}

export function ShiftFilters({
    filters,
    onFiltersChange,
    isAdmin,
    isOpen = false,
    onOpenChange,
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

    const handleDateChange = (field: 'startDateFrom' | 'startDateTo', date?: Date) => {
        handleFilterChange({ [field]: date })
    }

    const hasActiveFilters = Object.keys(filters).length > 0

    return (
        <>
            {/* Filter Toggle Button (for mobile/collapsible) */}
            {onOpenChange && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(!isOpen)}
                    className="gap-2"
                >
                    <HugeiconsIcon icon={FilterIcon} className="h-4 w-4" />
                    Filters
                    {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 flex items-center justify-center rounded-full text-[10px]">
                            {Object.keys(filters).length}
                        </Badge>
                    )}
                </Button>
            )}

            {/* Filter Panel */}
            {isOpen && (
                <Card className="border-primary/20 bg-card/50">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-sm">Filter Shifts</h3>
                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearFilters}
                                    className="text-xs"
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5 mr-1" />
                                    Clear All
                                </Button>
                            )}
                        </div>

                        {/* Grid layout for filters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            {/* Shift Type Filter */}
                            <div className="space-y-2">
                                <Label htmlFor="shift-type" className="text-xs font-medium">Shift Type</Label>
                                <Select
                                    value={filters.shiftType || 'all'}
                                    onValueChange={(value) =>
                                        handleFilterChange({
                                            shiftType: value === 'all' ? undefined : (value as ShiftType)
                                        })
                                    }
                                >
                                    <SelectTrigger id="shift-type" className="h-8">
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="MORNING">Morning</SelectItem>
                                        <SelectItem value="EVENING">Evening</SelectItem>
                                        <SelectItem value="NIGHT">Night</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status Filter */}
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Status</Label>
                                <Select
                                    value={filters.status || 'all'}
                                    onValueChange={(value) =>
                                        handleFilterChange({
                                            status: value === 'all' ? undefined : value
                                        })
                                    }
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="verified">Verified</SelectItem>
                                        <SelectItem value="pending_verification">Pending Review</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Admin-only: Attendant Select */}
                            {isAdmin && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Fuel Attendant</Label>
                                    <Select
                                        value={filters.userId ? filters.userId.toString() : 'all'}
                                        onValueChange={(value) =>
                                            handleFilterChange({
                                                userId: value === 'all' ? undefined : parseInt(value)
                                            })
                                        }
                                    >
                                        <SelectTrigger className="h-8">
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
                                </div>
                            )}

                            {/* Date From */}
                            <div className="space-y-2">
                                <Label htmlFor="date-from" className="text-xs font-medium">From Date</Label>
                                <DatePicker
                                    date={filters.startDateFrom}
                                    setDate={(date) => handleDateChange('startDateFrom', date)}
                                    className="h-8 text-xs"
                                    placeholder="From"
                                />
                            </div>

                            {/* Date To */}
                            <div className="space-y-2">
                                <Label htmlFor="date-to" className="text-xs font-medium">To Date</Label>
                                <DatePicker
                                    date={filters.startDateTo}
                                    setDate={(date) => handleDateChange('startDateTo', date)}
                                    className="h-8 text-xs"
                                    placeholder="To"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenChange?.(false)}
                                className="flex-1 h-8"
                            >
                                Close
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    )
}
