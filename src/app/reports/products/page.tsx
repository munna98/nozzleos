"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Spinner } from "@/components/ui/spinner"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    ArrowLeft01Icon,
    FilterIcon,
    Search01Icon,
    UserCircleIcon,
    PlusSignIcon,
    PencilEdit01Icon,
    Delete02Icon,
} from "@hugeicons/core-free-icons"
import { ProductSalesFilters } from "./components/ProductSalesFilters"
import { ProductSalesSummaryCards } from "./components/ProductSalesSummaryCards"
import { ReportExportDropdown } from "@/components/reports/ReportExportDropdown"
import {
    RecordProductSaleDialog,
    EditableDirectProductSale,
} from "@/components/record-product-sale-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { exportProductSalesReport } from "@/lib/reports/excel-export"
import { exportProductSalesPdfReport } from "@/lib/reports/pdf-export"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

export default function ProductSalesReportPage() {
    const router = useRouter()
    const { user } = useAuth()
    const isAdminOrManager = user?.role === "Admin" || user?.role === "Manager"
    const stationQuery = trpc.station.getCurrent.useQuery()
    const stationName = stationQuery.data?.name || user?.stationName || undefined

    // Filter states
    const [fromDate, setFromDate] = useState<Date | undefined>(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d
    })
    const [toDate, setToDate] = useState<Date | undefined>(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d
    })
    const [datePreset, setDatePreset] = useState<string>("today")
    const [selectedGroup, setSelectedGroup] = useState<string>("all")
    const [selectedProductId, setSelectedProductId] = useState<string>("all")
    const [selectedUserId, setSelectedUserId] = useState<string>("all")

    const [activeTab, setActiveTab] = useState<string>("by-product")
    const [productSearch, setProductSearch] = useState<string>("")
    const [page, setPage] = useState<number>(0)
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false)
    const [isExporting, setIsExporting] = useState<boolean>(false)
    const [isRecordSaleOpen, setIsRecordSaleOpen] = useState<boolean>(false)
    const [saleToEdit, setSaleToEdit] = useState<EditableDirectProductSale | null>(null)
    const [saleToDelete, setSaleToDelete] = useState<{ id: number; name: string; amount: number } | null>(null)
    const limit = 50
    const utils = trpc.useUtils()

    // Queries
    const groupsQuery = trpc.product.getGroups.useQuery()
    const productsQuery = trpc.product.getAll.useQuery()
    const attendantsQuery = trpc.user.getAll.useQuery(undefined, { enabled: isAdminOrManager })

    const deleteDirectSaleMutation = trpc.product.deleteDirectSale.useMutation({
        onSuccess: () => {
            utils.product.getSalesReport.invalidate()
            toast.success("Product sale deleted")
            setSaleToDelete(null)
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete product sale")
        },
    })

    const queryInput = {
        startDate: fromDate,
        endDate: toDate,
        group: selectedGroup !== "all" ? selectedGroup : undefined,
        productId: selectedProductId !== "all" ? parseInt(selectedProductId) : undefined,
        userId: selectedUserId !== "all" ? parseInt(selectedUserId) : undefined,
        limit,
        offset: page * limit,
    }

    const { data, isLoading } = trpc.product.getSalesReport.useQuery(queryInput)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount)
    }

    const handleResetFilters = () => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        setFromDate(today)
        setToDate(today)
        setDatePreset("today")
        setSelectedGroup("all")
        setSelectedProductId("all")
        setSelectedUserId("all")
        setPage(0)
    }

    // Filtered by-product table search
    const filteredByProduct = (data?.byProduct || []).filter((item) => {
        if (!productSearch.trim()) return true
        const query = productSearch.toLowerCase().trim()
        return (
            item.name.toLowerCase().includes(query) ||
            item.code.toLowerCase().includes(query) ||
            item.group.toLowerCase().includes(query)
        )
    })

    const activeFilterCount = [
        datePreset !== "today",
        selectedGroup !== "all",
        selectedProductId !== "all",
        selectedUserId !== "all",
    ].filter(Boolean).length

    const totalPages = data ? Math.ceil(data.pagination.total / limit) : 0

    const handleExportExcel = async () => {
        try {
            setIsExporting(true)
            const exportData = await utils.product.getSalesReport.fetch({
                ...queryInput,
                limit: 10000,
                offset: 0,
            })

            if (!exportData?.byProduct?.length && !exportData?.transactions?.length) {
                toast.error("No product sales found to export for the selected filters.")
                return
            }

            const dateRangeLabel = fromDate && toDate
                ? `${format(fromDate, "dd MMM yyyy")} to ${format(toDate, "dd MMM yyyy")}`
                : fromDate
                ? `From ${format(fromDate, "dd MMM yyyy")}`
                : "All Time"

            const productObj = productsQuery.data?.find((p) => p.id.toString() === selectedProductId)
            const attendantObj = attendantsQuery.data?.find((a) => a.id.toString() === selectedUserId)

            await exportProductSalesReport({
                byProduct: exportData.byProduct || [],
                byGroup: exportData.byGroup || [],
                transactions: exportData.transactions || [],
                summary: exportData.summary,
                dateRangeLabel,
                categoryLabel: selectedGroup === "all" ? "All Categories" : selectedGroup,
                productLabel: selectedProductId === "all" ? "All Products" : (productObj?.name || "Selected Product"),
                attendantLabel: selectedUserId === "all" ? "All Attendants" : (attendantObj?.name || attendantObj?.username || "Selected Attendant"),
                stationName,
            })

            toast.success("Product sales report exported to Excel successfully!")
        } catch (err: any) {
            console.error("Export error:", err)
            toast.error(err?.message || "Failed to export Excel report.")
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportPdf = async () => {
        try {
            setIsExporting(true)
            const exportData = await utils.product.getSalesReport.fetch({
                ...queryInput,
                limit: 10000,
                offset: 0,
            })

            if (activeTab === "by-product" && !exportData?.byProduct?.length) {
                toast.error("No product sales data found to export for the selected filters.")
                return
            } else if (activeTab === "by-group" && !exportData?.byGroup?.length) {
                toast.error("No category sales data found to export for the selected filters.")
                return
            } else if (activeTab === "transactions" && !exportData?.transactions?.length) {
                toast.error("No sales transactions found to export for the selected filters.")
                return
            }

            const dateRangeLabel = fromDate && toDate
                ? `${format(fromDate, "dd MMM yyyy")} to ${format(toDate, "dd MMM yyyy")}`
                : fromDate
                ? `From ${format(fromDate, "dd MMM yyyy")}`
                : "All Time"

            const productObj = productsQuery.data?.find((p) => p.id.toString() === selectedProductId)
            const attendantObj = attendantsQuery.data?.find((a) => a.id.toString() === selectedUserId)

            // If user is searching on the By Product tab, filter by that search
            const productsToExport = activeTab === "by-product" && productSearch.trim()
                ? (exportData.byProduct || []).filter((item) => {
                    const query = productSearch.toLowerCase().trim()
                    return (
                        item.name.toLowerCase().includes(query) ||
                        item.code.toLowerCase().includes(query) ||
                        item.group.toLowerCase().includes(query)
                    )
                })
                : (exportData.byProduct || [])

            await exportProductSalesPdfReport({
                byProduct: productsToExport,
                byGroup: exportData.byGroup || [],
                transactions: exportData.transactions || [],
                summary: exportData.summary,
                dateRangeLabel,
                categoryLabel: selectedGroup === "all" ? "All Categories" : selectedGroup,
                productLabel: selectedProductId === "all" ? "All Products" : (productObj?.name || "Selected Product"),
                attendantLabel: selectedUserId === "all" ? "All Attendants" : (attendantObj?.name || attendantObj?.username || "Selected Attendant"),
                activeTab,
                stationName,
            })

            const tabLabel =
                activeTab === "by-product"
                    ? "Product sales (By Product)"
                    : activeTab === "by-group"
                    ? "Product sales (By Category)"
                    : "Product sales log"

            toast.success(`${tabLabel} exported to PDF successfully!`)
        } catch (err: any) {
            console.error("Export PDF error:", err)
            toast.error(err?.message || "Failed to export PDF report.")
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <div className="container mx-auto py-10 space-y-6 px-4">
            {/* Header with Back Button and Filters at the right */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                            <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight">Product Sales</h2>
                    </div>

                    <div className="flex items-center gap-2 md:hidden">
                        {isAdminOrManager && (
                            <Button
                                size="sm"
                                className="h-9 gap-1.5"
                                onClick={() => {
                                    setSaleToEdit(null)
                                    setIsRecordSaleOpen(true)
                                }}
                            >
                                <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only">Record Sale</span>
                            </Button>
                        )}
                        <ReportExportDropdown
                            onExportExcel={handleExportExcel}
                            onExportPdf={handleExportPdf}
                            isExporting={isExporting}
                            pdfDescription={activeTab === "by-product" ? "By Product (.pdf)" : activeTab === "by-group" ? "By Category (.pdf)" : "Sales Log (.pdf)"}
                        />
                        {/* Mobile Filter Toggle */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="relative"
                        >
                            <HugeiconsIcon icon={FilterIcon} className="h-5 w-5" />
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="absolute -top-2 -right-2 h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[10px] bg-primary text-primary-foreground border-2 border-background">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Desktop Filters & Export */}
                <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2 md:flex-shrink-0">
                    <ProductSalesFilters
                        fromDate={fromDate}
                        setFromDate={(d) => { setFromDate(d); setPage(0); }}
                        toDate={toDate}
                        setToDate={(d) => { setToDate(d); setPage(0); }}
                        datePreset={datePreset}
                        setDatePreset={(preset) => { setDatePreset(preset); setPage(0); }}
                        selectedGroup={selectedGroup}
                        setSelectedGroup={(g) => { setSelectedGroup(g); setPage(0); }}
                        selectedProductId={selectedProductId}
                        setSelectedProductId={(p) => { setSelectedProductId(p); setPage(0); }}
                        selectedUserId={selectedUserId}
                        setSelectedUserId={(u) => { setSelectedUserId(u); setPage(0); }}
                        groups={groupsQuery.data || []}
                        products={productsQuery.data || []}
                        attendants={attendantsQuery.data || []}
                        onReset={handleResetFilters}
                        className="flex flex-row items-center gap-2"
                    />
                    <ReportExportDropdown
                        onExportExcel={handleExportExcel}
                        onExportPdf={handleExportPdf}
                        isExporting={isExporting}
                        pdfDescription={activeTab === "by-product" ? "By Product (.pdf)" : activeTab === "by-group" ? "By Category (.pdf)" : "Sales Log (.pdf)"}
                    />
                    {isAdminOrManager && (
                        <Button
                            className="h-9 gap-1.5"
                            onClick={() => {
                                setSaleToEdit(null)
                                setIsRecordSaleOpen(true)
                            }}
                        >
                            <HugeiconsIcon icon={PlusSignIcon} className="h-4 w-4" />
                            <span>Record Sale</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Filters (Collapsible) */}
            {isFilterOpen && (
                <div className="md:hidden p-4 bg-card border rounded-xl shadow-sm">
                    <ProductSalesFilters
                        fromDate={fromDate}
                        setFromDate={(d) => { setFromDate(d); setPage(0); }}
                        toDate={toDate}
                        setToDate={(d) => { setToDate(d); setPage(0); }}
                        datePreset={datePreset}
                        setDatePreset={(preset) => { setDatePreset(preset); setPage(0); }}
                        selectedGroup={selectedGroup}
                        setSelectedGroup={(g) => { setSelectedGroup(g); setPage(0); }}
                        selectedProductId={selectedProductId}
                        setSelectedProductId={(p) => { setSelectedProductId(p); setPage(0); }}
                        selectedUserId={selectedUserId}
                        setSelectedUserId={(u) => { setSelectedUserId(u); setPage(0); }}
                        groups={groupsQuery.data || []}
                        products={productsQuery.data || []}
                        attendants={attendantsQuery.data || []}
                        onReset={handleResetFilters}
                        className="flex flex-col gap-3"
                    />
                </div>
            )}

            {/* KPI Summary Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="h-28 flex items-center justify-center">
                            <Spinner className="h-6 w-6" />
                        </Card>
                    ))}
                </div>
            ) : (
                <ProductSalesSummaryCards
                    summary={data?.summary || {
                        totalSalesAmount: 0,
                        totalQuantity: 0,
                        transactionCount: 0,
                        uniqueProductsCount: 0,
                        topProduct: null,
                    }}
                />
            )}

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <TabsList className="grid w-full sm:w-auto grid-cols-3">
                        <TabsTrigger value="by-product" className="gap-2">
                            <span>By Product</span>
                            {data?.byProduct && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                    {data.byProduct.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="by-group" className="gap-2">
                            <span>By Category</span>
                            {data?.byGroup && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                    {data.byGroup.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="transactions" className="gap-2">
                            <span>Sales Log</span>
                            {data?.pagination && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                    {data.pagination.total}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === "by-product" && (
                        <div className="relative w-full sm:w-64">
                            <HugeiconsIcon icon={Search01Icon} className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>
                    )}
                </div>

                {/* Tab 1: By Product Breakdown */}
                <TabsContent value="by-product" className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-16">Code</TableHead>
                                            <TableHead>Product Name</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Quantity Sold</TableHead>
                                            <TableHead className="text-right">Avg Rate</TableHead>
                                            <TableHead className="text-right font-semibold">Total Revenue</TableHead>
                                            <TableHead className="w-32 text-right">% Share</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center">
                                                    <Spinner className="h-6 w-6 mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredByProduct.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                    No product sales found for the selected period.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredByProduct.map((p) => (
                                                <TableRow key={p.productId} className="hover:bg-muted/30">
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {p.code}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {p.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="text-xs font-normal capitalize">
                                                            {p.group}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {p.quantity.toLocaleString("en-IN", { maximumFractionDigits: 2 })} {p.unit}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground">
                                                        ₹{p.averagePrice.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-foreground">
                                                        {formatCurrency(p.amount)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden hidden sm:block">
                                                                <div
                                                                    className="bg-primary h-full rounded-full"
                                                                    style={{ width: `${Math.min(100, Math.max(2, p.percentage))}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                                                                {p.percentage.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                    {filteredByProduct.length > 0 && (
                                        <TableFooter>
                                            <TableRow className="bg-muted/70 font-semibold">
                                                <TableCell colSpan={3}>Total</TableCell>
                                                <TableCell className="text-right">
                                                    {filteredByProduct
                                                        .reduce((sum, p) => sum + p.quantity, 0)
                                                        .toLocaleString("en-IN", { maximumFractionDigits: 2 })} units
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell className="text-right text-primary text-base font-bold">
                                                    {formatCurrency(filteredByProduct.reduce((sum, p) => sum + p.amount, 0))}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                    100%
                                                </TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    )}
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: By Category Breakdown */}
                <TabsContent value="by-group" className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Category / Group</TableHead>
                                        <TableHead className="text-right">Total Units Sold</TableHead>
                                        <TableHead className="text-right">Sales Entries</TableHead>
                                        <TableHead className="text-right font-semibold">Total Revenue</TableHead>
                                        <TableHead className="w-36 text-right">% Contribution</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center">
                                                <Spinner className="h-6 w-6 mx-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ) : (data?.byGroup || []).length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                No category sales data found for the selected period.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data!.byGroup.map((g) => (
                                            <TableRow key={g.group} className="hover:bg-muted/30">
                                                <TableCell className="font-semibold capitalize">
                                                    <Badge variant="outline" className="px-2.5 py-0.5 text-xs">
                                                        {g.group}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {g.quantity.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {g.salesCount}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-foreground">
                                                    {formatCurrency(g.amount)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden hidden sm:block">
                                                            <div
                                                                className="bg-primary h-full rounded-full"
                                                                style={{ width: `${Math.min(100, Math.max(2, g.percentage))}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground font-mono w-10 text-right">
                                                            {g.percentage.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                                {data?.byGroup && data.byGroup.length > 0 && (
                                    <TableFooter>
                                        <TableRow className="bg-muted/70 font-semibold">
                                            <TableCell>Total</TableCell>
                                            <TableCell className="text-right">
                                                {data.byGroup.reduce((sum, g) => sum + g.quantity, 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {data.byGroup.reduce((sum, g) => sum + g.salesCount, 0)}
                                            </TableCell>
                                            <TableCell className="text-right text-primary text-base font-bold">
                                                {formatCurrency(data.byGroup.reduce((sum, g) => sum + g.amount, 0))}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                100%
                                            </TableCell>
                                        </TableRow>
                                    </TableFooter>
                                )}
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 3: Detailed Sales Log */}
                <TabsContent value="transactions" className="space-y-4">
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Date & Time</TableHead>
                                            <TableHead>Shift</TableHead>
                                            <TableHead>Attendant</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">Qty</TableHead>
                                            <TableHead className="text-right">Rate</TableHead>
                                            <TableHead className="text-right font-semibold">Amount</TableHead>
                                            {isAdminOrManager && (
                                                <TableHead className="text-right w-20">Actions</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={isAdminOrManager ? 8 : 7} className="h-32 text-center">
                                                    <Spinner className="h-6 w-6 mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : (data?.transactions || []).length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={isAdminOrManager ? 8 : 7} className="h-32 text-center text-muted-foreground">
                                                    No product sales log found for the selected period.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data!.transactions.map((t) => {
                                                const isDirectSale = !t.dutySessionId
                                                const saleDate = t.soldAt || t.createdAt
                                                const staffName =
                                                    t.dutySession?.user?.name ||
                                                    t.dutySession?.user?.username ||
                                                    t.soldByUser?.name ||
                                                    t.soldByUser?.username ||
                                                    t.createdByUser?.name ||
                                                    t.createdByUser?.username ||
                                                    "—"

                                                return (
                                                    <TableRow key={t.id} className="hover:bg-muted/30">
                                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {format(new Date(saleDate), "dd MMM yyyy, hh:mm a")}
                                                        </TableCell>
                                                        <TableCell>
                                                            {t.dutySession ? (
                                                                <Badge variant="outline" className="capitalize text-xs">
                                                                    {t.dutySession.type.toLowerCase()}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Direct Sale
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-sm font-medium">
                                                                <HugeiconsIcon icon={UserCircleIcon} className="h-4 w-4 text-muted-foreground" />
                                                                <span>{staffName}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-0.5">
                                                                <span className="font-medium text-sm block">{t.product?.name}</span>
                                                                {t.notes && (
                                                                    <span className="text-xs text-muted-foreground block">
                                                                        {t.notes}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {t.quantity} {t.product?.unit}
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                            ₹{t.price.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-foreground">
                                                            {formatCurrency(t.amount)}
                                                        </TableCell>
                                                        {isAdminOrManager && (
                                                            <TableCell className="text-right">
                                                                {isDirectSale ? (
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                            title="Edit Direct Sale"
                                                                            onClick={() => {
                                                                                setSaleToEdit({
                                                                                    id: t.id,
                                                                                    productId: t.product.id,
                                                                                    quantity: t.quantity,
                                                                                    price: t.price,
                                                                                    soldAt: saleDate,
                                                                                    soldByUserId: t.soldByUserId,
                                                                                    notes: t.notes,
                                                                                })
                                                                                setIsRecordSaleOpen(true)
                                                                            }}
                                                                        >
                                                                            <HugeiconsIcon icon={PencilEdit01Icon} className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                            title="Delete Direct Sale"
                                                                            onClick={() =>
                                                                                setSaleToDelete({
                                                                                    id: t.id,
                                                                                    name: t.product?.name || "Product",
                                                                                    amount: t.amount,
                                                                                })
                                                                            }
                                                                        >
                                                                            <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            {data && data.pagination.total > limit && (
                                <div className="flex items-center justify-between p-4 border-t">
                                    <p className="text-xs text-muted-foreground">
                                        Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.pagination.total)} of {data.pagination.total} sales
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => Math.max(0, p - 1))}
                                            disabled={page === 0}
                                        >
                                            Previous
                                        </Button>
                                        <span className="text-xs text-muted-foreground px-2">
                                            Page {page + 1} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page + 1 >= totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <RecordProductSaleDialog
                open={isRecordSaleOpen}
                onOpenChange={(open) => {
                    setIsRecordSaleOpen(open)
                    if (!open) setSaleToEdit(null)
                }}
                saleToEdit={saleToEdit}
            />

            <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Product Sale?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this direct product sale record.
                            {saleToDelete && (
                                <span className="mt-2 p-2 bg-muted rounded text-sm font-medium block">
                                    {saleToDelete.name} — {formatCurrency(saleToDelete.amount)}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteDirectSaleMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            disabled={deleteDirectSaleMutation.isPending}
                            onClick={() => {
                                if (saleToDelete) {
                                    deleteDirectSaleMutation.mutate({ id: saleToDelete.id })
                                }
                            }}
                        >
                            {deleteDirectSaleMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
