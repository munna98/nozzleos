"use client"

import { useState, useEffect } from "react"
import { PaymentMethod, PaymentMethodService } from "@/lib/api"
import { Button } from "@/components/ui/button"
// import { PlusIcon, PencilIcon, TrashIcon } from "@hugeicons/react"
import { Add01Icon, PencilEdit01Icon, Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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

export default function PaymentMethodsPage() {
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [methodToEdit, setMethodToEdit] = useState<PaymentMethod | undefined>(undefined)

    const fetchPaymentMethods = async () => {
        try {
            const data = await PaymentMethodService.getAll()
            setPaymentMethods(data)
        } catch (error) {
            console.error("Failed to fetch payment methods", error)
            toast.error("Failed to fetch payment methods")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPaymentMethods()
    }, [])

    const handleEdit = (method: PaymentMethod) => {
        setMethodToEdit(method)
        setIsAddDialogOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this payment method?")) return

        try {
            await PaymentMethodService.delete(id)
            toast.success("Payment method deleted successfully")
            fetchPaymentMethods()
        } catch (error: any) {
            console.error("Failed to delete payment method", error)
            const errorMessage = error.response?.data?.error || "Failed to delete payment method";
            toast.error(errorMessage)
        }
    }

    const handleDialogSuccess = () => {
        setIsAddDialogOpen(false)
        setMethodToEdit(undefined)
        fetchPaymentMethods()
    }

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Payment Methods</h2>
                </div>
                <Button onClick={() => {
                    setMethodToEdit(undefined)
                    setIsAddDialogOpen(true)
                }}>
                    <HugeiconsIcon icon={Add01Icon} className="mr-2 h-4 w-4" />
                    Add Payment Method
                </Button>
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
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : paymentMethods.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No payment methods found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paymentMethods.map((method) => (
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
                                                >
                                                    <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                                </Button>
                                                {!method.customerId && (
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
                    <div className="text-center py-10">Loading...</div>
                ) : paymentMethods.length === 0 ? (
                    <div className="text-center py-10">No payment methods found.</div>
                ) : (
                    paymentMethods.map((method) => (
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
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(method)}>
                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    {!method.customerId && (
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
        </div>
    )
}
