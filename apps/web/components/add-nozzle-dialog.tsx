"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { Nozzle, NozzleDto, Fuel, Dispenser } from "@/lib/api"
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

interface AddNozzleDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    nozzleToEdit?: Nozzle
    dispenserId?: number
}

export function AddNozzleDialog({
    open,
    onOpenChange,
    onSuccess,
    nozzleToEdit,
    dispenserId
}: AddNozzleDialogProps) {
    // Queries
    const fuelsQuery = trpc.fuel.getAll.useQuery()
    const dispensersQuery = trpc.dispenser.getAll.useQuery()

    // Mutations
    const utils = trpc.useUtils()
    const createNozzleMutation = trpc.nozzle.create.useMutation({
        onSuccess: () => {
            utils.dispenser.getAll.invalidate()
            toast.success("Nozzle created successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to create nozzle", error)
            toast.error(error.message || "Failed to create nozzle")
        }
    })

    const updateNozzleMutation = trpc.nozzle.update.useMutation({
        onSuccess: () => {
            utils.dispenser.getAll.invalidate()
            toast.success("Nozzle updated successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to update nozzle", error)
            toast.error(error.message || "Failed to update nozzle")
        }
    })

    const isPending = createNozzleMutation.isPending || updateNozzleMutation.isPending

    const [formData, setFormData] = useState<NozzleDto & { isActive: boolean }>({
        code: "",
        dispenserId: dispenserId || 0,
        fuelId: 0,
        price: 0,
        currentreading: 0,
        isActive: true
    })

    useEffect(() => {
        if (nozzleToEdit) {
            setFormData({
                code: nozzleToEdit.code,
                dispenserId: nozzleToEdit.dispenserId,
                fuelId: nozzleToEdit.fuelId,
                price: nozzleToEdit.price,
                currentreading: nozzleToEdit.currentreading || 0,
                isActive: nozzleToEdit.isActive
            })
        } else {
            setFormData({
                code: "",
                dispenserId: dispenserId || 0,
                fuelId: 0,
                price: 0,
                currentreading: 0,
                isActive: true
            })
        }
    }, [nozzleToEdit, dispenserId, open])

    // Derived state
    const fuels = fuelsQuery.data?.filter((f: Fuel) => f.isActive) || []
    const dispensers = dispensersQuery.data?.filter((d: Dispenser) => d.isActive) || []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (nozzleToEdit) {
            updateNozzleMutation.mutate({
                id: nozzleToEdit.id,
                data: {
                    ...formData,
                    isActive: formData.isActive
                }
            })
        } else {
            createNozzleMutation.mutate(formData)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{nozzleToEdit ? "Edit Nozzle" : "Add Nozzle"}</DialogTitle>
                    <DialogDescription>
                        {nozzleToEdit ? "Update nozzle details." : "Create a new nozzle here."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-left md:text-right">
                                Code
                            </Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="dispenser" className="text-left md:text-right">
                                Dispenser
                            </Label>
                            <Select
                                value={formData.dispenserId.toString()}
                                onValueChange={(val) => setFormData({ ...formData, dispenserId: parseInt(val) })}
                                disabled={!!dispenserId || !!nozzleToEdit}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select dispenser" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dispensers.map((d: Dispenser) => (
                                        <SelectItem key={d.id} value={d.id.toString()}>
                                            {d.code} - {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="fuel" className="text-left md:text-right">
                                Fuel
                            </Label>
                            <Select
                                value={formData.fuelId.toString()}
                                onValueChange={(val) => {
                                    const fuelId = parseInt(val)
                                    const selectedFuel = fuels.find((f: Fuel) => f.id === fuelId)
                                    const newPrice = selectedFuel ? selectedFuel.price : formData.price
                                    setFormData({
                                        ...formData,
                                        fuelId,
                                        price: newPrice
                                    })
                                }}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select fuel" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fuels.map((f: Fuel) => (
                                        <SelectItem key={f.id} value={f.id.toString()}>
                                            {f.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="currentreading" className="text-left md:text-right">
                                Current Reading
                            </Label>
                            <Input
                                id="currentreading"
                                type="number"
                                step="0.01"
                                value={formData.currentreading}
                                onChange={(e) => setFormData({ ...formData, currentreading: parseFloat(e.target.value) || 0 })}
                                className="col-span-3"
                                required
                            />
                        </div>

                        {nozzleToEdit && (
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
