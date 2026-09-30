"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { Dispenser, DispenserDto } from "@/lib/api"
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

interface AddDispenserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    dispenserToEdit?: Dispenser
}

export function AddDispenserDialog({
    open,
    onOpenChange,
    onSuccess,
    dispenserToEdit
}: AddDispenserDialogProps) {
    const [formData, setFormData] = useState<DispenserDto & { isActive: boolean }>({
        code: "",
        name: "",
        isActive: true
    })

    const utils = trpc.useUtils()
    const createDispenserMutation = trpc.dispenser.create.useMutation({
        onSuccess: () => {
            utils.dispenser.getAll.invalidate()
            toast.success("Dispenser created successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to create dispenser", error)
            toast.error(error.message || "Failed to create dispenser")
        }
    })

    const updateDispenserMutation = trpc.dispenser.update.useMutation({
        onSuccess: () => {
            utils.dispenser.getAll.invalidate()
            toast.success("Dispenser updated successfully")
            onSuccess()
        },
        onError: (error) => {
            console.error("Failed to update dispenser", error)
            toast.error(error.message || "Failed to update dispenser")
        }
    })

    const isPending = createDispenserMutation.isPending || updateDispenserMutation.isPending

    useEffect(() => {
        if (dispenserToEdit) {
            setFormData({
                code: dispenserToEdit.code,
                name: dispenserToEdit.name,
                isActive: dispenserToEdit.isActive
            })
        } else {
            setFormData({
                code: "",
                name: "",
                isActive: true
            })
        }
    }, [dispenserToEdit, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (dispenserToEdit) {
            updateDispenserMutation.mutate({
                id: dispenserToEdit.id,
                ...formData,
                isActive: formData.isActive
            })
        } else {
            createDispenserMutation.mutate(formData)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dispenserToEdit ? "Edit Dispenser" : "Add Dispenser"}</DialogTitle>
                    <DialogDescription>
                        {dispenserToEdit ? "Update dispenser details." : "Create a new dispenser here."}
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

                        {dispenserToEdit && (
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
