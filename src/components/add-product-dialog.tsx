"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { Product } from "@/lib/api"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon } from "@hugeicons/core-free-icons"

interface AddProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    productToEdit?: Product
}

export function AddProductDialog({
    open,
    onOpenChange,
    onSuccess,
    productToEdit
}: AddProductDialogProps) {
    const [code, setCode] = useState("")
    const [name, setName] = useState("")
    const [unit, setUnit] = useState<string>("Pcs")
    const [rate, setRate] = useState<string>("")
    const [group, setGroup] = useState<string>("Lubes")
    const [isActive, setIsActive] = useState<boolean>(true)

    const utils = trpc.useUtils()
    const nextCodeQuery = trpc.product.getNextCode.useQuery(undefined, {
        enabled: open && !productToEdit,
        staleTime: 0,
    })

    const createMutation = trpc.product.create.useMutation({
        onSuccess: () => {
            utils.product.getAll.invalidate()
            utils.product.getNextCode.invalidate()
            toast.success("Product created successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to create product", error)
            toast.error(error.message || "Failed to create product")
        }
    })

    const updateMutation = trpc.product.update.useMutation({
        onSuccess: () => {
            utils.product.getAll.invalidate()
            toast.success("Product updated successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to update product", error)
            toast.error(error.message || "Failed to update product")
        }
    })

    const isPending = createMutation.isPending || updateMutation.isPending

    useEffect(() => {
        if (open) {
            if (productToEdit) {
                setCode(productToEdit.code)
                setName(productToEdit.name)
                setUnit(productToEdit.unit || "Pcs")
                setRate(productToEdit.rate !== undefined && productToEdit.rate !== null ? productToEdit.rate.toString() : "")
                setGroup(productToEdit.group || "Lubes")
                setIsActive(productToEdit.isActive ?? true)
            } else {
                setName("")
                setUnit("Pcs")
                setRate("")
                setGroup("Lubes")
                setIsActive(true)
                if (nextCodeQuery.data?.nextCode) {
                    setCode(nextCodeQuery.data.nextCode)
                } else {
                    setCode("1001")
                }
            }
        }
    }, [productToEdit, open, nextCodeQuery.data?.nextCode])

    const handleAutoGenerateCode = async () => {
        const result = await utils.product.getNextCode.fetch()
        if (result?.nextCode) {
            setCode(result.nextCode)
            toast.info(`Code refreshed to ${result.nextCode}`)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error("Please enter a product name")
            return
        }

        const numericRate = rate.trim() === "" ? 0 : parseFloat(rate)
        if (isNaN(numericRate) || numericRate < 0) {
            toast.error("Please enter a valid rate (0 or higher)")
            return
        }

        if (productToEdit) {
            updateMutation.mutate({
                id: productToEdit.id,
                code: code.trim(),
                name: name.trim(),
                unit,
                rate: numericRate,
                group,
                isActive,
            })
        } else {
            createMutation.mutate({
                code: code.trim() || undefined,
                name: name.trim(),
                unit,
                rate: numericRate,
                group,
                isActive,
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{productToEdit ? "Edit Product" : "Add Product"}</DialogTitle>
                    <DialogDescription>
                        {productToEdit
                            ? "Update product pricing, units, or status."
                            : "Add a new product with code, unit, rate, and category."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    {/* Code */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="code" className="text-sm font-medium">
                                Product Code <span className="text-destructive">*</span>
                            </Label>
                            {!productToEdit && (
                                <button
                                    type="button"
                                    onClick={handleAutoGenerateCode}
                                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                                    title="Regenerate auto code"
                                >
                                    <HugeiconsIcon icon={RefreshIcon} className="h-3 w-3" />
                                    Auto Next
                                </button>
                            )}
                        </div>
                        <Input
                            id="code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="e.g. 1001"
                            required
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Auto-generated starting from 1001; you can customize or change it anytime.
                        </p>
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                        <Label htmlFor="name" className="text-sm font-medium">
                            Product Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Engine Oil 20W40, DEF 20L Bucket"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Group */}
                        <div className="space-y-1.5">
                            <Label htmlFor="group" className="text-sm font-medium">
                                Group <span className="text-destructive">*</span>
                            </Label>
                            <Select value={group} onValueChange={setGroup}>
                                <SelectTrigger id="group" className="w-full">
                                    <SelectValue placeholder="Select group" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Lubes">Lubes</SelectItem>
                                    <SelectItem value="Def">Def</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Unit */}
                        <div className="space-y-1.5">
                            <Label htmlFor="unit" className="text-sm font-medium">
                                Unit <span className="text-destructive">*</span>
                            </Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger id="unit" className="w-full">
                                    <SelectValue placeholder="Select unit" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Pcs">Pcs (Pieces)</SelectItem>
                                    <SelectItem value="L">L (Litres)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Rate */}
                    <div className="space-y-1.5">
                        <Label htmlFor="rate" className="text-sm font-medium">
                            Rate / Price (₹) <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                ₹
                            </span>
                            <Input
                                id="rate"
                                type="number"
                                step="0.01"
                                min="0"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                className="pl-7"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {/* Status if editing */}
                    {productToEdit && (
                        <div className="space-y-1.5 pt-1">
                            <Label htmlFor="status" className="text-sm font-medium">
                                Status
                            </Label>
                            <Select
                                value={isActive ? "true" : "false"}
                                onValueChange={(val) => setIsActive(val === "true")}
                            >
                                <SelectTrigger id="status" className="w-full">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Active</SelectItem>
                                    <SelectItem value="false">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : productToEdit ? "Save Changes" : "Add Product"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
