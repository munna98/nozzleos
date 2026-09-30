"use client"

import { useState, useRef, useEffect } from "react"
import { PaymentMethod } from "@/lib/api"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Add01Icon, PencilEdit01Icon, Delete02Icon, Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { Spinner } from "@/components/ui/spinner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AddPaymentMethodDialog } from "@/components/add-payment-method-dialog"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
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

export default function PaymentMethodsPage() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [methodToEdit, setMethodToEdit] = useState<PaymentMethod | undefined>(undefined)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [methodToDeleteId, setMethodToDeleteId] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const paymentMethodsQuery = trpc.paymentMethod.getAll.useQuery()
    const utils = trpc.useUtils()
    const deleteMutation = trpc.paymentMethod.delete.useMutation({
        onSuccess: () => {
            utils.paymentMethod.getAll.invalidate()
            toast.success("Payment method deleted successfully")
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete payment method")
        }
    })

    const paymentMethods = paymentMethodsQuery.data || []
    const loading = paymentMethodsQuery.isLoading

    const filteredPaymentMethods = paymentMethods.filter((method: PaymentMethod) => {
        const query = searchQuery.toLowerCase()
        return method.name?.toLowerCase().includes(query)
    })

    const handleEdit = (method: PaymentMethod) => {
        setMethodToEdit(method)
        setIsAddDialogOpen(true)
    }

    const handleDelete = (id: number) => {
        setMethodToDeleteId(id)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = () => {
        if (methodToDeleteId) {
            deleteMutation.mutate({ id: methodToDeleteId }, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false)
                    setMethodToDeleteId(null)
                }
            })
        }
    }

    const handleDialogSuccess = () => {
        setIsAddDialogOpen(false)
        setMethodToEdit(undefined)
        paymentMethodsQuery.refetch()
    }

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div className="flex justify-between items-center gap-4">
                {/* Mobile: Expandable Search */}
                <div className={`md:hidden ${isSearchOpen ? 'flex-1' : ''}`}>
                    {isSearchOpen ? (
                        <div className="relative flex items-center gap-2 w-full">
                            <HugeiconsIcon
                                icon={Search01Icon}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                            />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search payment methods..."
                                className="pl-9 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => {
                                    if (!searchQuery) {
                                        setIsSearchOpen(false)
                                    }
                                }}
                                autoFocus
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setSearchQuery("")
                                    setIsSearchOpen(false)
                                }}
                            >
                                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <h2 className="text-3xl font-bold tracking-tight">Payment Methods</h2>
                    )}
                </div>

                {/* Desktop: Title */}
                <h2 className="hidden md:block text-3xl font-bold tracking-tight">Payment Methods</h2>

                {/* Mobile: Search + Add Buttons (shown when search is closed) */}
                {!isSearchOpen && (
                    <div className="flex md:hidden items-center gap-2">
                        <Button variant="secondary" size="icon" onClick={() => setIsSearchOpen(true)}>
                            <HugeiconsIcon icon={Search01Icon} className="h-5 w-5" />
                        </Button>
                        <Button onClick={() => {
                            setMethodToEdit(undefined)
                            setIsAddDialogOpen(true)
                        }} size="icon">
                            <HugeiconsIcon icon={Add01Icon} className="h-5 w-5" />
                        </Button>
                    </div>
                )}

                {/* Desktop: Search + Add Button */}
                <div className="hidden md:flex items-center gap-2">
                    <div className="relative w-64">
                        <HugeiconsIcon
                            icon={Search01Icon}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        />
                        <Input
                            placeholder="Search payment methods..."
                            className="pl-9 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => {
                        setMethodToEdit(undefined)
                        setIsAddDialogOpen(true)
                    }}>
                        <HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
                        Add Payment Method
                    </Button>
                </div>
            </div>

            <Card className="hidden md:block">
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Spinner className="size-6 mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredPaymentMethods.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No payment methods found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPaymentMethods.map((method: PaymentMethod) => (
                                    <TableRow key={method.id}>
                                        <TableCell className="font-medium">{method.name}</TableCell>
                                        <TableCell>
                                            <Badge variant={method.isActive ? "default" : "secondary"}>
                                                {method.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {method.customerId ? (
                                                <Badge variant="outline">Customer</Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Standard</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(method)}
                                                    disabled={method.name === 'Cash'}
                                                >
                                                    <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                                </Button>
                                                {!method.customerId && method.name !== 'Cash' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => handleDelete(method.id)}
                                                    >
                                                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile View - Card List */}
            <div className="space-y-4 md:hidden">
                {loading ? (
                    <div className="text-center py-10"><Spinner className="size-6 mx-auto" /></div>
                ) : filteredPaymentMethods.length === 0 ? (
                    <div className="text-center py-10">No payment methods found.</div>
                ) : (
                    filteredPaymentMethods.map((method: PaymentMethod) => (
                        <Card key={method.id}>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="font-semibold">{method.name}</div>
                                    <Badge variant={method.isActive ? "default" : "secondary"}>
                                        {method.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">Type:</div>
                                    <div>
                                        {method.customerId ? (
                                            <Badge variant="outline">Customer</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">Standard</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(method)}
                                        disabled={method.name === 'Cash'}
                                    >
                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    {!method.customerId && method.name !== 'Cash' && (
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(method.id)}>
                                            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" /> Delete
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <AddPaymentMethodDialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                    if (!open) setMethodToEdit(undefined)
                    setIsAddDialogOpen(open)
                }}
                onSuccess={handleDialogSuccess}
                paymentMethodToEdit={methodToEdit}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the payment method.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMethodToDeleteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} variant="destructive">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
