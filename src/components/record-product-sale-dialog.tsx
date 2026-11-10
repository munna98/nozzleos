"use client"

import { useState, useMemo } from "react"
import { trpc } from "@/lib/trpc"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DateTimePicker } from "@/components/ui/datetime-picker"
import { Spinner } from "@/components/ui/spinner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    PackageIcon,
    PlusSignIcon,
    Delete02Icon,
    Loading03Icon,
    UserIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

export interface EditableDirectProductSale {
    id: number
    productId: number
    quantity: number
    price: number
    soldAt: Date | string
    soldByUserId?: number | null
    notes?: string | null
}

interface SaleLineItem {
    key: string
    productId: string
    quantity: string
    price: string
}

interface RecordProductSaleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    saleToEdit?: EditableDirectProductSale | null
}

let lineItemSeq = 0
const createEmptyItem = (): SaleLineItem => ({
    key: `item-${++lineItemSeq}`,
    productId: "",
    quantity: "1",
    price: "",
})

interface RecordProductSaleFormProps {
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
    saleToEdit?: EditableDirectProductSale | null
    defaultUserId?: number
}

function RecordProductSaleForm({
    onOpenChange,
    onSuccess,
    saleToEdit,
    defaultUserId,
}: RecordProductSaleFormProps) {
    const utils = trpc.useUtils()

    const [items, setItems] = useState<SaleLineItem[]>(() =>
        saleToEdit
            ? [
                {
                    key: `edit-${saleToEdit.id}`,
                    productId: saleToEdit.productId.toString(),
                    quantity: parseFloat(saleToEdit.quantity.toString()).toString(),
                    price: parseFloat(saleToEdit.price.toString()).toString(),
                },
            ]
            : [createEmptyItem()]
    )
    const [soldAt, setSoldAt] = useState<Date | undefined>(() =>
        saleToEdit?.soldAt ? new Date(saleToEdit.soldAt) : new Date()
    )
    const [soldByUserId, setSoldByUserId] = useState<string>(() =>
        saleToEdit
            ? saleToEdit.soldByUserId
                ? saleToEdit.soldByUserId.toString()
                : "none"
            : defaultUserId
                ? defaultUserId.toString()
                : "none"
    )
    const [notes, setNotes] = useState<string>(() => saleToEdit?.notes || "")

    const productsQuery = trpc.product.getAll.useQuery({ activeOnly: true })
    const activeStaffQuery = trpc.user.getActiveStaff.useQuery()

    const products = useMemo(() => productsQuery.data || [], [productsQuery.data])
    const staffList = activeStaffQuery.data || []

    const productMap = useMemo(() => {
        return new Map(products.map((p) => [p.id.toString(), p]))
    }, [products])

    const createMutation = trpc.product.createDirectSales.useMutation({
        onSuccess: (created) => {
            utils.product.getSalesReport.invalidate()
            toast.success(
                created.length === 1
                    ? "Product sale recorded"
                    : `${created.length} product sales recorded`
            )
            onOpenChange(false)
            onSuccess?.()
        },
        onError: (error) => {
            toast.error(error.message || "Failed to record product sale")
        },
    })

    const updateMutation = trpc.product.updateDirectSale.useMutation({
        onSuccess: () => {
            utils.product.getSalesReport.invalidate()
            toast.success("Product sale updated")
            onOpenChange(false)
            onSuccess?.()
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update product sale")
        },
    })

    const isPending = createMutation.isPending || updateMutation.isPending

    const handleProductChange = (key: string, productId: string) => {
        const product = productMap.get(productId)
        setItems((prev) =>
            prev.map((item) =>
                item.key === key
                    ? {
                        ...item,
                        productId,
                        price: product
                            ? parseFloat(product.rate.toString()).toString()
                            : item.price,
                    }
                    : item
            )
        )
    }

    const handleItemFieldChange = (
        key: string,
        field: "quantity" | "price",
        value: string
    ) => {
        setItems((prev) =>
            prev.map((item) =>
                item.key === key ? { ...item, [field]: value } : item
            )
        )
    }

    const handleAddRow = () => {
        setItems((prev) => [...prev, createEmptyItem()])
    }

    const handleRemoveRow = (key: string) => {
        setItems((prev) =>
            prev.length > 1 ? prev.filter((item) => item.key !== key) : prev
        )
    }

    const grandTotal = useMemo(() => {
        return items.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0
            const selectedProd = productMap.get(item.productId)
            const price =
                item.price.trim() !== ""
                    ? parseFloat(item.price) || 0
                    : selectedProd
                        ? parseFloat(selectedProd.rate.toString())
                        : 0
            return sum + qty * price
        }, 0)
    }, [items, productMap])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!soldAt) {
            toast.error("Please pick a sale date and time")
            return
        }

        const parsedItems: Array<{
            productId: number
            quantity: number
            price?: number
        }> = []

        for (let i = 0; i < items.length; i++) {
            const row = items[i]
            if (!row.productId) {
                toast.error(`Please select a product for item #${i + 1}`)
                return
            }

            const qty = parseFloat(row.quantity)
            if (isNaN(qty) || qty <= 0) {
                toast.error(`Please enter a valid quantity greater than 0 for item #${i + 1}`)
                return
            }

            const price = row.price.trim() !== "" ? parseFloat(row.price) : undefined
            if (price !== undefined && (isNaN(price) || price < 0)) {
                toast.error(`Please enter a valid rate (0 or higher) for item #${i + 1}`)
                return
            }

            parsedItems.push({
                productId: parseInt(row.productId, 10),
                quantity: qty,
                price,
            })
        }

        const staffIdValue =
            soldByUserId && soldByUserId !== "none" ? parseInt(soldByUserId, 10) : null
        const trimmedNotes = notes.trim()

        if (saleToEdit) {
            const single = parsedItems[0]
            updateMutation.mutate({
                id: saleToEdit.id,
                productId: single.productId,
                quantity: single.quantity,
                price: single.price,
                soldAt,
                soldByUserId: staffIdValue,
                notes: trimmedNotes || null,
            })
        } else {
            createMutation.mutate({
                soldAt,
                soldByUserId: staffIdValue,
                notes: trimmedNotes || undefined,
                items: parsedItems,
            })
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* Product Line Items */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                        Products <span className="text-destructive">*</span>
                    </Label>
                    {!saleToEdit && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={handleAddRow}
                            disabled={isPending}
                        >
                            <HugeiconsIcon icon={PlusSignIcon} className="h-3.5 w-3.5" />
                            Add Another Product
                        </Button>
                    )}
                </div>

                {productsQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center border rounded-lg">
                        <Spinner className="size-4" /> Loading active products...
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item, idx) => {
                            const selectedProduct = productMap.get(item.productId)
                            const qtyNum = parseFloat(item.quantity) || 0
                            const priceNum =
                                item.price.trim() !== ""
                                    ? parseFloat(item.price) || 0
                                    : selectedProduct
                                        ? parseFloat(selectedProduct.rate.toString())
                                        : 0
                            const lineTotal = qtyNum * priceNum

                            return (
                                <div
                                    key={item.key}
                                    className="p-3 rounded-lg border bg-muted/20 space-y-3"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {saleToEdit ? "Product Details" : `Item #${idx + 1}`}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-foreground">
                                                Subtotal: ₹{lineTotal.toFixed(2)}
                                            </span>
                                            {!saleToEdit && items.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleRemoveRow(item.key)}
                                                    disabled={isPending}
                                                    title="Remove item"
                                                >
                                                    <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                        <div className="sm:col-span-6 space-y-1.5">
                                            <Label htmlFor={`sale-product-${item.key}`} className="text-xs">
                                                Product
                                            </Label>
                                            <Select
                                                value={item.productId}
                                                onValueChange={(val) =>
                                                    handleProductChange(item.key, val)
                                                }
                                            >
                                                <SelectTrigger id={`sale-product-${item.key}`} className="w-full">
                                                    <SelectValue placeholder="Select a product" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products.map((product) => (
                                                        <SelectItem
                                                            key={product.id}
                                                            value={product.id.toString()}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono text-xs text-muted-foreground">
                                                                    {product.code}
                                                                </span>
                                                                <span>{product.name}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    (₹{parseFloat(product.rate.toString()).toFixed(2)}/{product.unit})
                                                                </span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                    {products.length === 0 && (
                                                        <SelectItem value="none" disabled>
                                                            No active products available
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="sm:col-span-3 space-y-1.5">
                                            <Label htmlFor={`sale-qty-${item.key}`} className="text-xs">
                                                Qty {selectedProduct ? `(${selectedProduct.unit})` : ""}
                                            </Label>
                                            <Input
                                                id={`sale-qty-${item.key}`}
                                                type="number"
                                                step="any"
                                                min="0.01"
                                                placeholder="1"
                                                value={item.quantity}
                                                onChange={(e) =>
                                                    handleItemFieldChange(
                                                        item.key,
                                                        "quantity",
                                                        e.target.value
                                                    )
                                                }
                                                required
                                            />
                                        </div>

                                        <div className="sm:col-span-3 space-y-1.5">
                                            <Label htmlFor={`sale-rate-${item.key}`} className="text-xs">
                                                Rate (₹)
                                            </Label>
                                            <Input
                                                id={`sale-rate-${item.key}`}
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                placeholder={
                                                    selectedProduct
                                                        ? parseFloat(selectedProduct.rate.toString()).toFixed(2)
                                                        : "0.00"
                                                }
                                                value={item.price}
                                                onChange={(e) =>
                                                    handleItemFieldChange(
                                                        item.key,
                                                        "price",
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Sale Date/Time & Optional Staff Attribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                        Sale Date & Time <span className="text-destructive">*</span>
                    </Label>
                    <DateTimePicker
                        date={soldAt}
                        setDate={setSoldAt}
                        placeholder="Pick sale date & time"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="sale-staff" className="text-sm font-medium flex items-center gap-1.5">
                        <HugeiconsIcon icon={UserIcon} className="h-3.5 w-3.5 text-muted-foreground" />
                        Staff / Attendant (Optional)
                    </Label>
                    <Select value={soldByUserId} onValueChange={setSoldByUserId}>
                        <SelectTrigger id="sale-staff" className="w-full">
                            <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Unassigned (Direct Entry)</SelectItem>
                            {staffList.map((st) => (
                                <SelectItem key={st.id} value={st.id.toString()}>
                                    <span>
                                        {st.name ? `${st.name} (${st.username})` : st.username}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1.5">
                <Label htmlFor="sale-notes" className="text-sm font-medium">
                    Notes / Remarks (Optional)
                </Label>
                <Textarea
                    id="sale-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Customer name, vehicle number, cash memo reference..."
                    rows={2}
                    maxLength={500}
                />
            </div>

            {/* Grand Total */}
            <div className="pt-3 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {items.length} {items.length === 1 ? "item" : "items"}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                        Grand Total:
                    </span>
                    <span className="text-xl font-bold text-primary">
                        ₹{grandTotal.toFixed(2)}
                    </span>
                </div>
            </div>

            <DialogFooter className="pt-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isPending}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isPending || productsQuery.isLoading || products.length === 0}
                >
                    {isPending ? (
                        <>
                            <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : saleToEdit ? (
                        "Update Sale"
                    ) : (
                        "Save Sale"
                    )}
                </Button>
            </DialogFooter>
        </form>
    )
}

export function RecordProductSaleDialog({
    open,
    onOpenChange,
    onSuccess,
    saleToEdit,
}: RecordProductSaleDialogProps) {
    const { user: currentUser } = useAuth()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={PackageIcon} className="h-5 w-5 text-primary" />
                        {saleToEdit ? "Edit Product Sale" : "Record Product Sale"}
                    </DialogTitle>
                    <DialogDescription>
                        {saleToEdit
                            ? "Update the product, quantity, rate, date/time, or notes for this direct sale."
                            : "Record one or more product sales directly without creating a shift."}
                    </DialogDescription>
                </DialogHeader>

                {open && (
                    <RecordProductSaleForm
                        key={saleToEdit ? `edit-${saleToEdit.id}` : "new-sale"}
                        onOpenChange={onOpenChange}
                        onSuccess={onSuccess}
                        saleToEdit={saleToEdit}
                        defaultUserId={currentUser?.id}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
