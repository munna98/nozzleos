"use client"

import { useState, useEffect } from "react"
import { FuelService, Fuel, FuelDto } from "@/lib/api"
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

interface AddFuelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    fuelToEdit?: Fuel
}

export function AddFuelDialog({
    open,
    onOpenChange,
    onSuccess,
    fuelToEdit
}: AddFuelDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<FuelDto & { isActive: boolean }>({
        name: "",
        price: 0,
        isActive: true
    })

    useEffect(() => {
        if (fuelToEdit) {
            setFormData({
                name: fuelToEdit.name,
                price: fuelToEdit.price,
                isActive: fuelToEdit.isActive
            })
        } else {
            setFormData({
                name: "",
                price: 0,
                isActive: true
            })
        }
    }, [fuelToEdit, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (fuelToEdit) {
                await FuelService.update(fuelToEdit.id, formData)
            } else {
                await FuelService.create(formData)
            }
            onSuccess()
            toast.success(fuelToEdit ? "Fuel updated successfully" : "Fuel created successfully")
        } catch (error) {
            console.error("Failed to save fuel", error)
            toast.error("Failed to save fuel")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{fuelToEdit ? "Edit Fuel" : "Add Fuel"}</DialogTitle>
                    <DialogDescription>
                        {fuelToEdit ? "Update fuel details." : "Create a new fuel type here."}
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
                            <Label htmlFor="price" className="text-left md:text-right">
                                Price
                            </Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                className="col-span-3"
                                required
                            />
                        </div>

                        {fuelToEdit && (
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
