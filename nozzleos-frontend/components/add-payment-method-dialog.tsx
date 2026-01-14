"use client"

import { useState, useEffect } from "react"
import { PaymentMethod, PaymentMethodDto, PaymentMethodService } from "@/lib/api"
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
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<PaymentMethodDto>({
        name: "",
        isActive: true
    })

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
        setLoading(true)

        try {
            if (paymentMethodToEdit) {
                await PaymentMethodService.update(paymentMethodToEdit.id, formData)
            } else {
                await PaymentMethodService.create(formData)
            }
            onSuccess()
            toast.success(paymentMethodToEdit ? "Payment method updated successfully" : "Payment method created successfully")
        } catch (error: any) {
            console.error("Failed to save payment method", error)
            const errorMessage = error.response?.data?.error || "Failed to save payment method";
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{paymentMethodToEdit ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
                    <DialogDescription>
                        {paymentMethodToEdit ? "Update payment method details." : "Create a new payment method."}
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
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
