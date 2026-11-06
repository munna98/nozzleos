"use client"

import { useState } from "react"
import { DatePicker } from "@/components/ui/date-picker"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

interface ProductGroup {
    id: number
    name: string
    color?: string | null
}

interface Product {
    id: number
    code: string
    name: string
    unit: string
    group: string
}

interface Attendant {
    id: number
    name: string | null
    username: string
}

interface ProductSalesFiltersProps {
    fromDate?: Date
    setFromDate: (date?: Date) => void
    toDate?: Date
    setToDate: (date?: Date) => void
    datePreset: string
    setDatePreset: (val: string) => void
    selectedGroup: string
    setSelectedGroup: (val: string) => void
    selectedProductId: string
    setSelectedProductId: (val: string) => void
    selectedUserId: string
    setSelectedUserId: (val: string) => void
    groups: ProductGroup[]
    products: Product[]
    attendants: Attendant[]
    onReset: () => void
    className?: string
}

export function ProductSalesFilters({
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    datePreset,
    setDatePreset,
    selectedGroup,
    setSelectedGroup,
    selectedProductId,
    setSelectedProductId,
    selectedUserId,
    setSelectedUserId,
    groups,
    products,
    attendants,
    onReset,
    className = "",
}: ProductSalesFiltersProps) {
    const [isCustom, setIsCustom] = useState(datePreset === "custom")

    const handlePresetChange = (preset: string) => {
        setDatePreset(preset)
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        if (preset === "today") {
            setIsCustom(false)
            setFromDate(today)
            setToDate(today)
        } else if (preset === "yesterday") {
            setIsCustom(false)
            const yesterday = new Date(today)
            yesterday.setDate(yesterday.getDate() - 1)
            setFromDate(yesterday)
            setToDate(yesterday)
        } else if (preset === "this_week") {
            setIsCustom(false)
            const weekStart = new Date(today)
            const day = weekStart.getDay()
            const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
            weekStart.setDate(diff)
            setFromDate(weekStart)
            setToDate(today)
        } else if (preset === "this_month") {
            setIsCustom(false)
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
            setFromDate(monthStart)
            setToDate(today)
        } else if (preset === "last_month") {
            setIsCustom(false)
            const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
            const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
            setFromDate(lastMonthStart)
            setToDate(lastMonthEnd)
        } else if (preset === "custom") {
            setIsCustom(true)
        }
    }

    const filteredProducts = selectedGroup && selectedGroup !== "all"
        ? products.filter(p => p.group?.toLowerCase() === selectedGroup.toLowerCase())
        : products

    const hasActiveFilters =
        datePreset !== "today" ||
        selectedGroup !== "all" ||
        selectedProductId !== "all" ||
        selectedUserId !== "all"

    return (
        <div className={className}>
            {/* Date Range Preset */}
            <div className="w-full md:w-auto">
                <Select value={isCustom ? "custom" : datePreset} onValueChange={handlePresetChange}>
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

            {/* Custom Date Pickers (only shown if Custom) */}
            {isCustom && (
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex-1 md:flex-initial">
                        <DatePicker
                            date={fromDate}
                            setDate={setFromDate}
                            placeholder="From"
                            className="w-full md:w-[130px]"
                        />
                    </div>
                    <span className="text-muted-foreground shrink-0">-</span>
                    <div className="flex-1 md:flex-initial">
                        <DatePicker
                            date={toDate}
                            setDate={setToDate}
                            placeholder="To"
                            className="w-full md:w-[130px]"
                        />
                    </div>
                </div>
            )}

            {/* Category / Group Filter */}
            <div className="w-full md:w-auto">
                <Select
                    value={selectedGroup}
                    onValueChange={(val) => {
                        setSelectedGroup(val)
                        setSelectedProductId("all")
                    }}
                >
                    <SelectTrigger className="w-full md:w-[150px]">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {groups.map((group) => (
                            <SelectItem key={group.id} value={group.name}>
                                {group.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Product Filter */}
            <div className="w-full md:w-auto">
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="w-full md:w-[170px]">
                        <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        {filteredProducts.map((p) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                                {p.code} - {p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Attendant / Staff Filter */}
            <div className="w-full md:w-auto">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-full md:w-[160px]">
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
            </div>

            {/* Clear Filters (if active) */}
            {hasActiveFilters && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onReset}
                    title="Clear Filters"
                    className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 hidden md:flex"
                >
                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                </Button>
            )}

            {/* Clear Filters on mobile */}
            {hasActiveFilters && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onReset}
                    className="w-full md:hidden text-xs gap-1.5 mt-1"
                >
                    <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5" />
                    Clear Filters
                </Button>
            )}
        </div>
    )
}
