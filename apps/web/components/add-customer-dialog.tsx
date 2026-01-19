"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { Customer, CreateCustomerDto, UpdateCustomerDto } from "@/lib/api"
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
import { Checkbox as RequestCheckbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

interface AddCustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    customerToEdit?: Customer
}

export function AddCustomerDialog({
    open,
    onOpenChange,
    onSuccess,
    customerToEdit
}: AddCustomerDialogProps) {
    const [formData, setFormData] = useState<CreateCustomerDto & { isActive: boolean }>({
        name: "",
        email: "",
        phone: "",
        isActive: true
    })

    const utils = trpc.useUtils()
    const createCustomerMutation = trpc.customer.create.useMutation({
        onSuccess: () => {
            utils.customer.getAll.invalidate()
            toast.success("Customer created successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to create customer", error)
            toast.error(error.message || "Failed to create customer")
        }
    })

    const updateCustomerMutation = trpc.customer.update.useMutation({
        onSuccess: () => {
            utils.customer.getAll.invalidate()
            toast.success("Customer updated successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to update customer", error)
            toast.error(error.message || "Failed to update customer")
        }
    })

    const isPending = createCustomerMutation.isPending || updateCustomerMutation.isPending

    useEffect(() => {
        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name,
                email: customerToEdit.email || "",
                phone: customerToEdit.phone || "",
                isActive: customerToEdit.isActive,
                createPaymentMethod: !!customerToEdit.paymentMethod
            })
        } else {
            setFormData({
                name: "",
                email: "",
                phone: "",
                isActive: true,
                createPaymentMethod: true
            })
        }
    }, [customerToEdit, open])


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (customerToEdit) {
            updateCustomerMutation.mutate({
                id: customerToEdit.id,
                data: {
                    ...formData,
                    isActive: formData.isActive,
                    createPaymentMethod: formData.createPaymentMethod
                }
            })
        } else {
            createCustomerMutation.mutate({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                createPaymentMethod: formData.createPaymentMethod
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{customerToEdit ? "Edit Customer" : "Add Customer"}</DialogTitle>
                    <DialogDescription>
                        {customerToEdit ? "Update customer details." : "Create a new customer profile here."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-left md:text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-left md:text-right">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email || ""}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-left md:text-right">
                                Phone
                            </Label>
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <div className="md:col-start-2 flex items-center space-x-2 col-span-3">
                                <RequestCheckbox
                                    id="createPaymentMethod"
                                    checked={formData.createPaymentMethod !== false}
                                    onCheckedChange={(checked: boolean) =>
                                        setFormData({ ...formData, createPaymentMethod: checked === true })
                                    }
                                />
                                <Label htmlFor="createPaymentMethod" className="font-normal cursor-pointer">
                                    {customerToEdit ? "Use as Payment Method" : "Add as Payment Method"}
                                </Label>
                            </div>
                        </div>

                        {customerToEdit && (
                            <div className="grid md:grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-left md:text-right">
                                    Status
                                </Label>
                                <Select
                                    value={formData.isActive ? "true" : "false"}
                                    onValueChange={(val) => setFormData({ ...formData, isActive: val === "true" })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Active</SelectItem>
                                        <SelectItem value="false">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
