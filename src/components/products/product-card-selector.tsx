"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Search01Icon,
    CheckmarkCircle02Icon,
    Cancel01Icon,
    PackageIcon,
} from "@hugeicons/core-free-icons"
import { getGroupBadgeStyle } from "@/components/manage-product-groups-dialog"

export interface ProductItem {
    id: number
    name: string
    code?: string
    unit: string
    rate: number | string | any
    group: string
    isActive?: boolean
}

export interface ProductGroupItem {
    id?: number
    name: string
    color?: string | null
}

interface ProductCardSelectorProps {
    products: ProductItem[]
    groups?: ProductGroupItem[]
    selectedProductId: string
    onSelectProduct: (product: ProductItem) => void
    disabled?: boolean
    className?: string
    maxHeightClass?: string
    showSearch?: boolean
}

export function ProductCardSelector({
    products,
    groups = [],
    selectedProductId,
    onSelectProduct,
    disabled = false,
    className = "",
    maxHeightClass = "max-h-56",
    showSearch = true,
}: ProductCardSelectorProps) {
    const [selectedGroup, setSelectedGroup] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState<string>("")

    // Map group name to group metadata (for colors)
    const groupColorMap = useMemo(() => {
        const map = new Map<string, string | null>()
        groups.forEach((g) => {
            map.set(g.name.toLowerCase(), g.color || null)
        })
        return map
    }, [groups])

    // Extract dynamic unique groups with product counts
    const groupStats = useMemo(() => {
        const counts = new Map<string, number>()
        products.forEach((p) => {
            const grp = p.group || "Other"
            const key = grp.toLowerCase()
            counts.set(key, (counts.get(key) || 0) + 1)
        })

        // Combine groups from DB and distinct product groups
        const distinctNames = new Set<string>()
        groups.forEach((g) => distinctNames.add(g.name))
        products.forEach((p) => distinctNames.add(p.group || "Other"))

        const list = Array.from(distinctNames).map((name) => {
            const count = counts.get(name.toLowerCase()) || 0
            const color = groupColorMap.get(name.toLowerCase()) || null
            return { name, count, color }
        })

        return list.filter((g) => g.count > 0)
    }, [products, groups, groupColorMap])

    // Filter products by selected group and search query
    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        return products.filter((p) => {
            const matchesGroup =
                selectedGroup === "all" ||
                (p.group && p.group.toLowerCase() === selectedGroup.toLowerCase())

            if (!matchesGroup) return false
            if (!query) return true

            return (
                p.name.toLowerCase().includes(query) ||
                (p.code && p.code.toLowerCase().includes(query)) ||
                (p.group && p.group.toLowerCase().includes(query))
            )
        })
    }, [products, selectedGroup, searchQuery])

    return (
        <div className={`space-y-2.5 ${className}`}>
            {/* Search and Group Filter Header */}
            <div className="space-y-2">
                {showSearch && (
                    <div className="relative">
                        <HugeiconsIcon
                            icon={Search01Icon}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"
                        />
                        <Input
                            type="text"
                            placeholder="Search product by name or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            disabled={disabled}
                            className="h-8 pl-8 pr-7 text-xs rounded-lg"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <HugeiconsIcon icon={Cancel01Icon} className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Group Filter Pills */}
                {groupStats.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                        <Button
                            type="button"
                            size="sm"
                            variant={selectedGroup === "all" ? "default" : "outline"}
                            className="h-7 px-2.5 rounded-full text-[11px] font-medium shrink-0"
                            onClick={() => setSelectedGroup("all")}
                            disabled={disabled}
                        >
                            All ({products.length})
                        </Button>
                        {groupStats.map((grp) => {
                            const isSelected = selectedGroup.toLowerCase() === grp.name.toLowerCase()
                            return (
                                <Button
                                    key={grp.name}
                                    type="button"
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    className="h-7 px-2.5 rounded-full text-[11px] font-medium shrink-0 capitalize"
                                    onClick={() => setSelectedGroup(grp.name)}
                                    disabled={disabled}
                                >
                                    {grp.name} ({grp.count})
                                </Button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Product Cards Grid */}
            <div
                className={`grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto p-0.5 rounded-lg border bg-muted/10 ${maxHeightClass}`}
            >
                {filteredProducts.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                        <HugeiconsIcon icon={PackageIcon} className="h-6 w-6 text-muted-foreground/50" />
                        <span>No products found matching this filter</span>
                    </div>
                ) : (
                    filteredProducts.map((product) => {
                        const isSelected = selectedProductId === product.id.toString()
                        const groupColor = groupColorMap.get(product.group?.toLowerCase()) || null
                        const badgeStyle = getGroupBadgeStyle(groupColor, product.group)
                        const rateNum = parseFloat(product.rate?.toString() || "0")

                        return (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => !disabled && onSelectProduct(product)}
                                disabled={disabled}
                                className={`group relative p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 select-none ${
                                    isSelected
                                        ? "border-primary bg-primary/10 ring-2 ring-primary/25 shadow-xs"
                                        : "bg-card hover:bg-muted/40 hover:border-primary/40 border-border"
                                } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                            >
                                {/* Top: Group Tag & Selection Checkmark */}
                                <div className="flex items-start justify-between gap-1 w-full">
                                    <Badge
                                        variant="outline"
                                        className={`text-[9px] px-1.5 py-0 h-4.5 font-normal truncate max-w-[85px] ${badgeStyle}`}
                                    >
                                        {product.group}
                                    </Badge>
                                    {isSelected && (
                                        <HugeiconsIcon
                                            icon={CheckmarkCircle02Icon}
                                            className="h-4 w-4 text-primary shrink-0 animate-in fade-in zoom-in-75 duration-150"
                                        />
                                    )}
                                </div>

                                {/* Middle: Product Name */}
                                <div className="space-y-0.5 min-h-[32px] flex flex-col justify-center">
                                    <span className="font-semibold text-xs leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                                        {product.name}
                                    </span>
                                    {product.code && (
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            {product.code}
                                        </span>
                                    )}
                                </div>

                                {/* Bottom: Price & Unit */}
                                <div className="pt-1.5 border-t border-border/50 flex items-baseline justify-between w-full">
                                    <span className="text-xs font-bold text-foreground">
                                        ₹{rateNum.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        /{product.unit}
                                    </span>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
