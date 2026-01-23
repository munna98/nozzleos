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
    const [localFilters, setLocalFilters] = useState<ShiftFiltersState>(filters)
    const [attendants, setAttendants] = useState<Array<{ id: number; name: string | null; username: string }>>([])
    const attendantsQuery = trpc.user.getAll.useQuery(
        { role: 'Attendant' },
        { enabled: isAdmin }
    )

    useEffect(() => {
        if (attendantsQuery.data) {
            setAttendants(attendantsQuery.data.map((u: any) => ({
                id: u.id,
                name: u.name,
                username: u.username
            })))
        }
    }, [attendantsQuery.data])

    const handleApplyFilters = () => {
        onFiltersChange(localFilters)
        onOpenChange?.(false)
    }

    const handleClearFilters = () => {
        const cleared = {}
        setLocalFilters(cleared)
        onFiltersChange(cleared)
        onOpenChange?.(false)
    }

    const handleDateChange = (field: 'startDateFrom' | 'startDateTo', value: string) => {
        const date = value ? new Date(value) : undefined
        setLocalFilters(prev => ({
            ...prev,
            [field]: date
        }))
    }

    const hasActiveFilters = Object.keys(filters).length > 0

    const formatDateForInput = (date?: Date) => {
        if (!date) return ''
        const d = new Date(date)
        return d.toISOString().split('T')[0]
    }

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
                                    value={localFilters.shiftType || 'all'}
                                    onValueChange={(value) =>
                                        setLocalFilters(prev => ({
                                            ...prev,
                                            shiftType: value === 'all' ? undefined : (value as ShiftType)
                                        }))
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
                                    value={localFilters.status || 'all'}
                                    onValueChange={(value) =>
                                        setLocalFilters(prev => ({
                                            ...prev,
                                            status: value === 'all' ? undefined : value
                                        }))
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

                            {/* Date From */}
                            <div className="space-y-2">
                                <Label htmlFor="date-from" className="text-xs font-medium">From Date</Label>
                                <Input
                                    id="date-from"
                                    type="date"
                                    value={formatDateForInput(localFilters.startDateFrom)}
                                    onChange={(e) => handleDateChange('startDateFrom', e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>

                            {/* Date To */}
                            <div className="space-y-2">
                                <Label htmlFor="date-to" className="text-xs font-medium">To Date</Label>
                                <Input
                                    id="date-to"
                                    type="date"
                                    value={formatDateForInput(localFilters.startDateTo)}
                                    onChange={(e) => handleDateChange('startDateTo', e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>

                            {/* Admin-only: Attendant Select */}
                            {isAdmin && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Attendant</Label>
                                    <Select
                                        value={localFilters.userId ? localFilters.userId.toString() : 'all'}
                                        onValueChange={(value) =>
                                            setLocalFilters(prev => ({
                                                ...prev,
                                                userId: value === 'all' ? undefined : parseInt(value)
                                            }))
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
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                            <Button
                                size="sm"
                                onClick={handleApplyFilters}
                                className="flex-1 h-8"
                            >
                                Apply Filters
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onOpenChange?.(false)}
                                className="h-8"
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
