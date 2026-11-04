"use client"

import { useState, useRef } from "react"
import { Product } from "@/lib/api"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    PlusSignIcon,
    Delete02Icon,
    PencilEdit01Icon,
    Search01Icon,
    Cancel01Icon,
    PackageIcon,
} from "@hugeicons/core-free-icons"
import { AddProductDialog } from "@/components/add-product-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
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

export default function ProductsPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [productIdToDelete, setProductIdToDelete] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedGroup, setSelectedGroup] = useState<string>("all")
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const productsQuery = trpc.product.getAll.useQuery()
    const utils = trpc.useUtils()
    const deleteMutation = trpc.product.delete.useMutation({
        onSuccess: () => {
            utils.product.getAll.invalidate()
            utils.product.getNextCode.invalidate()
            toast.success("Product deleted successfully")
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete product")
        }
    })

    const products = productsQuery.data || []
    const loading = productsQuery.isLoading

    // Filter products by search query and group
    const filteredProducts = products.filter((product: Product) => {
        const query = searchQuery.toLowerCase().trim()
        const matchesQuery =
            !query ||
            product.name.toLowerCase().includes(query) ||
            product.code.toLowerCase().includes(query) ||
            product.group.toLowerCase().includes(query)

        const matchesGroup =
            selectedGroup === "all" ||
            product.group.toLowerCase() === selectedGroup.toLowerCase()

        return matchesQuery && matchesGroup
    })

    // Group counts for stats
    const lubesCount = products.filter(p => p.group.toLowerCase() === "lubes").length
    const defCount = products.filter(p => p.group.toLowerCase() === "def").length
    const otherCount = products.filter(p => p.group.toLowerCase() !== "lubes" && p.group.toLowerCase() !== "def").length

    const handleAddClick = () => {
        setSelectedProduct(undefined)
        setIsDialogOpen(true)
    }

    const handleEditClick = (product: Product) => {
        setSelectedProduct(product)
        setIsDialogOpen(true)
    }

    const handleDeleteClick = (id: number) => {
        setProductIdToDelete(id)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = () => {
        if (productIdToDelete) {
            deleteMutation.mutate({ id: productIdToDelete }, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false)
                    setProductIdToDelete(null)
                }
            })
        }
    }

    const handleSuccess = () => {
        setIsDialogOpen(false)
        productsQuery.refetch()
    }

    const getGroupBadgeClass = (group: string) => {
        const g = group.toLowerCase()
        if (g === "lubes") {
            return "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
        }
        if (g === "def") {
            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
        }
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
    }

    return (
        <div className="container mx-auto py-10 space-y-6 px-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-bold tracking-tight">Products</h2>
                        <Badge variant="secondary" className="font-mono text-xs">
                            {products.length}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage lubricants, DEF, and other non-fuel inventory items
                    </p>
                </div>
                <Button onClick={handleAddClick}>
                    <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" /> Add Product
                </Button>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold mt-1">{products.length}</p>
                </Card>
                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Lubes</p>
                    <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{lubesCount}</p>
                </Card>
                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">DEF</p>
                    <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{defCount}</p>
                </Card>
                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Other</p>
                    <p className="text-2xl font-bold mt-1 text-slate-600 dark:text-slate-400">{otherCount}</p>
                </Card>
            </div>

            {/* Filters & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Group Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <Button
                        size="sm"
                        variant={selectedGroup === "all" ? "default" : "outline"}
                        className="rounded-full text-xs h-8"
                        onClick={() => setSelectedGroup("all")}
                    >
                        All ({products.length})
                    </Button>
                    <Button
                        size="sm"
                        variant={selectedGroup === "lubes" ? "default" : "outline"}
                        className="rounded-full text-xs h-8"
                        onClick={() => setSelectedGroup("lubes")}
                    >
                        Lubes ({lubesCount})
                    </Button>
                    <Button
                        size="sm"
                        variant={selectedGroup === "def" ? "default" : "outline"}
                        className="rounded-full text-xs h-8"
                        onClick={() => setSelectedGroup("def")}
                    >
                        DEF ({defCount})
                    </Button>
                    <Button
                        size="sm"
                        variant={selectedGroup === "other" ? "default" : "outline"}
                        className="rounded-full text-xs h-8"
                        onClick={() => setSelectedGroup("other")}
                    >
                        Other ({otherCount})
                    </Button>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    />
                    <Input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search by code, name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-8 h-9 text-sm"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Desktop Table View */}
            <Card className="hidden md:block">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="w-[140px]">Group</TableHead>
                                <TableHead className="w-[100px]">Unit</TableHead>
                                <TableHead className="w-[140px]">Rate</TableHead>
                                <TableHead className="w-[110px]">Status</TableHead>
                                <TableHead className="text-right w-[110px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <Spinner className="size-6 mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                                            <HugeiconsIcon icon={PackageIcon} className="h-10 w-10 stroke-1 opacity-50" />
                                            <p className="text-sm font-medium">No products found</p>
                                            {searchQuery || selectedGroup !== "all" ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSearchQuery("")
                                                        setSelectedGroup("all")
                                                    }}
                                                >
                                                    Clear filters
                                                </Button>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={handleAddClick}>
                                                    <HugeiconsIcon icon={PlusSignIcon} className="mr-1 h-3.5 w-3.5" />
                                                    Add your first product
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product: Product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-mono font-semibold text-xs">
                                            {product.code}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {product.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`capitalize text-xs font-medium border ${getGroupBadgeClass(product.group)}`}
                                            >
                                                {product.group}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs px-2 py-0.5 rounded bg-muted font-medium">
                                                {product.unit}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-semibold">
                                            ₹{product.rate.toFixed(2)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                                                {product.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Edit product"
                                                onClick={() => handleEditClick(product)}
                                            >
                                                <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Delete product"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteClick(product.id)}
                                            >
                                                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile View - Card List */}
            <div className="space-y-3 md:hidden">
                {loading ? (
                    <div className="text-center py-12">
                        <Spinner className="size-6 mx-auto" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center">
                            <HugeiconsIcon icon={PackageIcon} className="h-10 w-10 stroke-1 opacity-50 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm font-medium text-muted-foreground">No products found</p>
                            {searchQuery || selectedGroup !== "all" ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => {
                                        setSearchQuery("")
                                        setSelectedGroup("all")
                                    }}
                                >
                                    Clear filters
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" className="mt-2" onClick={handleAddClick}>
                                    <HugeiconsIcon icon={PlusSignIcon} className="mr-1 h-3.5 w-3.5" />
                                    Add product
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    filteredProducts.map((product: Product) => (
                        <Card key={product.id}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                                                #{product.code}
                                            </span>
                                            <span className="font-semibold text-sm">{product.name}</span>
                                        </div>
                                    </div>
                                    <Badge variant={product.isActive ? "default" : "secondary"} className="text-[10px]">
                                        {product.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                                    <div>
                                        <div className="text-muted-foreground text-[10px]">Group</div>
                                        <Badge
                                            variant="outline"
                                            className={`capitalize text-[10px] mt-0.5 border ${getGroupBadgeClass(product.group)}`}
                                        >
                                            {product.group}
                                        </Badge>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[10px]">Unit</div>
                                        <div className="font-medium mt-0.5">{product.unit}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground text-[10px]">Rate</div>
                                        <div className="font-semibold text-sm mt-0.5">₹{product.rate.toFixed(2)}</div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditClick(product)}
                                    >
                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-3.5 w-3.5 mr-1" /> Edit
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteClick(product.id)}
                                    >
                                        <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5 mr-1" /> Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Add / Edit Dialog */}
            <AddProductDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={handleSuccess}
                productToEdit={selectedProduct}
            />

            {/* Delete Confirmation Alert Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this product.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProductIdToDelete(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} variant="destructive">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
