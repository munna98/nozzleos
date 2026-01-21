"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { PaymentMethod, PaymentMethodDto } from "@/lib/api"
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

interface AddPaymentMethodDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    paymentMethodToEdit?: PaymentMethod
}

export function AddPaymentMethodDialog({
    open,
    onOpenChange,
    onSuccess,
    paymentMethodToEdit
}: AddPaymentMethodDialogProps) {
    const [formData, setFormData] = useState<PaymentMethodDto & { isActive: boolean }>({
        name: "",
        isActive: true
    })

    const utils = trpc.useUtils()
    const createMutation = trpc.paymentMethod.create.useMutation({
        onSuccess: () => {
            utils.paymentMethod.getAll.invalidate()
            toast.success("Payment method created successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to create payment method", error)
            toast.error(error.message || "Failed to create payment method")
        }
    })

    const updateMutation = trpc.paymentMethod.update.useMutation({
        onSuccess: () => {
            utils.paymentMethod.getAll.invalidate()
            toast.success("Payment method updated successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to update payment method", error)
            toast.error(error.message || "Failed to update payment method")
        }
    })

    const isPending = createMutation.isPending || updateMutation.isPending

    useEffect(() => {
        if (paymentMethodToEdit) {
            setFormData({
                name: paymentMethodToEdit.name,
                isActive: paymentMethodToEdit.isActive
            })
        } else {
            setFormData({
                name: "",
                isActive: true
            })
        }
    }, [paymentMethodToEdit, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (paymentMethodToEdit) {
            updateMutation.mutate({
                id: paymentMethodToEdit.id,
                ...formData,
                isActive: formData.isActive
            })
        } else {
            createMutation.mutate(formData)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{paymentMethodToEdit ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
                    <DialogDescription>
                        {paymentMethodToEdit ? "Update payment method details." : "Create a new payment method here."}
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

                        {paymentMethodToEdit && (
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
