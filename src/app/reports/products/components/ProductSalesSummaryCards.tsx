"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    PackageIcon,
    DropletIcon,
} from "@hugeicons/core-free-icons"
import { Trophy } from "lucide-react"

interface TopProduct {
    productId: number
    code: string
    name: string
    unit: string
    group: string
    quantity: number
    amount: number
    salesCount: number
}

interface SummaryData {
    totalSalesAmount: number
    totalQuantity: number
    transactionCount: number
    uniqueProductsCount: number
    topProduct: TopProduct | null
}

interface ProductSalesSummaryCardsProps {
    summary: SummaryData
    isLoading?: boolean
}

export function ProductSalesSummaryCards({ summary, isLoading }: ProductSalesSummaryCardsProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(val)
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Revenue */}
            <Card className="relative overflow-hidden border shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total Sales
                            </p>
                            <h3 className="text-2xl font-bold tracking-tight text-primary">
                                {formatCurrency(summary.totalSalesAmount)}
                            </h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <HugeiconsIcon icon={PackageIcon} className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[11px] font-normal">
                            {summary.transactionCount} {summary.transactionCount === 1 ? "entry" : "entries"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">recorded</span>
                    </div>
                </CardContent>
            </Card>

            {/* Total Units Sold */}
            <Card className="relative overflow-hidden border shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Total Units Sold
                            </p>
                            <h3 className="text-2xl font-bold tracking-tight">
                                {summary.totalQuantity.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </h3>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <HugeiconsIcon icon={DropletIcon} className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[11px] font-normal">
                            {summary.uniqueProductsCount} {summary.uniqueProductsCount === 1 ? "product" : "products"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">sold</span>
                    </div>
                </CardContent>
            </Card>

            {/* Top Selling Product */}
            <Card className="relative overflow-hidden border shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1 min-w-0 pr-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Top Product
                            </p>
                            <h3 className="text-xl font-bold tracking-tight truncate" title={summary.topProduct?.name || "None"}>
                                {summary.topProduct ? summary.topProduct.name : "None"}
                            </h3>
                        </div>
                        <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                            <Trophy className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                        {summary.topProduct ? (
                            <>
                                <span className="font-semibold text-foreground">
                                    {formatCurrency(summary.topProduct.amount)}
                                </span>
                                <span>
                                    ({summary.topProduct.quantity} {summary.topProduct.unit})
                                </span>
                            </>
                        ) : (
                            <span>No product sales in range</span>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
