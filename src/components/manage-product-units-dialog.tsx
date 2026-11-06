"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    PlusSignIcon,
    PencilEdit01Icon,
    Delete02Icon,
    CheckmarkCircle02Icon,
    Cancel01Icon,
    Loading03Icon,
    RulerIcon,
    AlertCircleIcon,
} from "@hugeicons/core-free-icons"
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

interface ManageProductUnitsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUnitSelected?: (unitCode: string) => void
}

export function ManageProductUnitsDialog({
    open,
    onOpenChange,
    onUnitSelected,
}: ManageProductUnitsDialogProps) {
    const [newUnitCode, setNewUnitCode] = useState("")
    const [newUnitName, setNewUnitName] = useState("")

    // Editing State
    const [editingUnitId, setEditingUnitId] = useState<number | null>(null)
    const [editCode, setEditCode] = useState("")
    const [editName, setEditName] = useState("")

    // Deleting State
    const [unitToDelete, setUnitToDelete] = useState<{ id: number; code: string; name: string; productCount?: number } | null>(null)

    const utils = trpc.useUtils()
    const unitsQuery = trpc.product.getUnits.useQuery(undefined, { enabled: open })

    const createMutation = trpc.product.createUnit.useMutation({
        onSuccess: (data) => {
            utils.product.getUnits.invalidate()
            utils.product.getAll.invalidate()
            toast.success(`Unit "${data.code}" (${data.name}) added successfully`)
            setNewUnitCode("")
            setNewUnitName("")
            if (onUnitSelected) onUnitSelected(data.code)
        },
        onError: (err) => toast.error(err.message)
    })

    const updateMutation = trpc.product.updateUnit.useMutation({
        onSuccess: (data) => {
            utils.product.getUnits.invalidate()
            utils.product.getAll.invalidate()
            toast.success(`Unit "${data.code}" updated successfully`)
            setEditingUnitId(null)
        },
        onError: (err) => toast.error(err.message)
    })

    const deleteMutation = trpc.product.deleteUnit.useMutation({
        onSuccess: () => {
            utils.product.getUnits.invalidate()
            utils.product.getAll.invalidate()
            toast.success("Unit deleted successfully")
            setUnitToDelete(null)
        },
        onError: (err) => {
            toast.error(err.message)
            setUnitToDelete(null)
        }
    })

    const handleCreateUnit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newUnitCode.trim()) {
            toast.error("Please enter a unit code (e.g. Can, Bkt, Kg)")
            return
        }
        if (!newUnitName.trim()) {
            toast.error("Please enter a unit description (e.g. Cans, Buckets, Kilograms)")
            return
        }
        createMutation.mutate({
            code: newUnitCode.trim(),
            name: newUnitName.trim(),
        })
    }

    const handleStartEdit = (unit: { id: number; code: string; name: string }) => {
        setEditingUnitId(unit.id)
        setEditCode(unit.code)
        setEditName(unit.name)
    }

    const handleSaveEdit = (id: number) => {
        if (!editCode.trim() || !editName.trim()) {
            toast.error("Unit code and name cannot be empty")
            return
        }
        updateMutation.mutate({
            id,
            code: editCode.trim(),
            name: editName.trim(),
        })
    }

    const units = unitsQuery.data || []

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[540px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <HugeiconsIcon icon={RulerIcon} className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle>Manage Product Units</DialogTitle>
                                <DialogDescription>
                                    Add, edit, or customize units of measurement (e.g. Pcs, L, Can, Box).
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Add New Unit Section */}
                    <form onSubmit={handleCreateUnit} className="p-3 bg-muted/40 rounded-lg border space-y-3">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Add New Unit
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                            <div className="sm:col-span-2">
                                <Input
                                    placeholder="Symbol (e.g. Can, Box)"
                                    value={newUnitCode}
                                    onChange={(e) => setNewUnitCode(e.target.value)}
                                    className="h-9 text-sm bg-background"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Input
                                    placeholder="Full Name (e.g. Cans, Boxes)"
                                    value={newUnitName}
                                    onChange={(e) => setNewUnitName(e.target.value)}
                                    className="h-9 text-sm bg-background"
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="w-full h-9"
                                    disabled={!newUnitCode.trim() || !newUnitName.trim() || createMutation.isPending}
                                >
                                    {createMutation.isPending ? (
                                        <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <HugeiconsIcon icon={PlusSignIcon} className="mr-1 h-3.5 w-3.5" />
                                            Add
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>

                    {/* Units List */}
                    <div className="space-y-2 mt-1">
                        <div className="flex justify-between items-center px-1">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Existing Units ({units.length})
                            </Label>
                            {unitsQuery.isLoading && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <HugeiconsIcon icon={Loading03Icon} className="h-3 w-3 animate-spin" />
                                    Loading...
                                </span>
                            )}
                        </div>

                        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                            {units.map((unit) => {
                                const isEditing = editingUnitId === unit.id

                                return (
                                    <div
                                        key={unit.id}
                                        className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-2"
                                    >
                                        {isEditing ? (
                                            <div className="flex-1 flex items-center gap-2">
                                                <Input
                                                    value={editCode}
                                                    onChange={(e) => setEditCode(e.target.value)}
                                                    className="h-8 w-24 text-sm"
                                                    placeholder="Symbol"
                                                    autoFocus
                                                />
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="h-8 flex-1 text-sm"
                                                    placeholder="Name"
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    onClick={() => handleSaveEdit(unit.id)}
                                                    disabled={updateMutation.isPending}
                                                    title="Save"
                                                >
                                                    {updateMutation.isPending ? (
                                                        <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setEditingUnitId(null)}
                                                    title="Cancel"
                                                >
                                                    <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono text-xs font-semibold">
                                                        {unit.code}
                                                    </Badge>
                                                    <span className="text-sm font-medium">
                                                        {unit.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        ({unit.productCount || 0} {unit.productCount === 1 ? 'product' : 'products'})
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleStartEdit(unit)}
                                                        title="Edit Unit"
                                                    >
                                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setUnitToDelete(unit)}
                                                        title="Delete Unit"
                                                    >
                                                        <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}

                            {units.length === 0 && !unitsQuery.isLoading && (
                                <div className="text-center py-6 text-sm text-muted-foreground">
                                    No units found. Add your first unit above.
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Unit Confirmation Alert */}
            <AlertDialog open={!!unitToDelete} onOpenChange={(open) => !open && setUnitToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Unit?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {unitToDelete && (unitToDelete.productCount ?? 0) > 0 ? (
                                <div className="space-y-2 mt-2">
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex gap-2">
                                        <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>
                                            Cannot delete <strong>&quot;{unitToDelete.code}&quot; ({unitToDelete.name})</strong> because it is currently assigned to <strong>{unitToDelete.productCount}</strong> product(s). Please reassign or delete those products first.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    Are you sure you want to delete unit <strong>&quot;{unitToDelete?.code}&quot; ({unitToDelete?.name})</strong>? This action cannot be undone.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {(unitToDelete?.productCount ?? 0) > 0 ? "Understood" : "Cancel"}
                        </AlertDialogCancel>
                        {(!unitToDelete || (unitToDelete.productCount ?? 0) === 0) && (
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                    if (unitToDelete) {
                                        deleteMutation.mutate({ id: unitToDelete.id })
                                    }
                                }}
                            >
                                Delete
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
