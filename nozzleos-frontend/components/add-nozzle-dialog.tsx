"use client"

import { useState, useEffect } from "react"
import { NozzleService, Nozzle, NozzleDto, FuelService, Fuel, DispenserService, Dispenser } from "@/lib/api"
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
    const [loading, setLoading] = useState(false)
    const [fuels, setFuels] = useState<Fuel[]>([])
    const [dispensers, setDispensers] = useState<Dispenser[]>([])
    const [formData, setFormData] = useState<NozzleDto & { isActive: boolean }>({
        code: "",
        dispenserId: dispenserId || 0,
        fuelId: 0,
        price: 0,
        isActive: true
    })

    useEffect(() => {
        if (open) {
            fetchData()
        }
    }, [open])

    useEffect(() => {
        if (nozzleToEdit) {
            setFormData({
                code: nozzleToEdit.code,
                dispenserId: nozzleToEdit.dispenserId,
                fuelId: nozzleToEdit.fuelId,
                price: nozzleToEdit.price,
                isActive: nozzleToEdit.isActive
            })
        } else {
            setFormData({
                code: "",
                dispenserId: dispenserId || 0,
                fuelId: 0,
                price: 0,
                isActive: true
            })
        }
    }, [nozzleToEdit, dispenserId, open])

    const fetchData = async () => {
        try {
            const [fuelsData, dispensersData] = await Promise.all([
                FuelService.getAll(),
                DispenserService.getAll()
            ])
            setFuels(fuelsData.filter(f => f.isActive))
            setDispensers(dispensersData.filter(d => d.isActive))
        } catch (error) {
            console.error("Failed to fetch data", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (nozzleToEdit) {
                await NozzleService.update(nozzleToEdit.id, formData)
            } else {
                await NozzleService.create(formData)
            }
            onSuccess()
            toast.success(nozzleToEdit ? "Nozzle updated successfully" : "Nozzle created successfully")
        } catch (error) {
            console.error("Failed to save nozzle", error)
            toast.error("Failed to save nozzle")
        } finally {
            setLoading(false)
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
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select dispenser" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dispensers.map(d => (
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
                                    const selectedFuel = fuels.find(f => f.id === fuelId)
                                    setFormData({
                                        ...formData,
                                        fuelId,
                                        price: selectedFuel ? selectedFuel.price : formData.price
                                    })
                                }}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select fuel" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fuels.map(f => (
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
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
