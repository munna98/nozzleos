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
    Tag01Icon,
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

export const GROUP_COLOR_OPTIONS = [
    { value: 'blue', label: 'Blue', badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800', dotClass: 'bg-blue-500' },
    { value: 'emerald', label: 'Emerald', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', dotClass: 'bg-emerald-500' },
    { value: 'amber', label: 'Amber', badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800', dotClass: 'bg-amber-500' },
    { value: 'purple', label: 'Purple', badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800', dotClass: 'bg-purple-500' },
    { value: 'rose', label: 'Rose', badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800', dotClass: 'bg-rose-500' },
    { value: 'cyan', label: 'Cyan', badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800', dotClass: 'bg-cyan-500' },
    { value: 'slate', label: 'Slate', badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700', dotClass: 'bg-slate-500' },
]

export function getGroupBadgeStyle(color?: string | null, groupName?: string): string {
    const c = color?.toLowerCase()
    const match = GROUP_COLOR_OPTIONS.find(o => o.value === c)
    if (match) return match.badgeClass

    const name = groupName?.toLowerCase() || ''
    if (name === 'lubes') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    if (name === 'def') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
}

interface ManageProductGroupsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onGroupSelected?: (groupName: string) => void
}

export function ManageProductGroupsDialog({
    open,
    onOpenChange,
    onGroupSelected,
}: ManageProductGroupsDialogProps) {
    const [newGroupName, setNewGroupName] = useState("")
    const [newGroupColor, setNewGroupColor] = useState("blue")

    // Editing State
    const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
    const [editName, setEditName] = useState("")
    const [editColor, setEditColor] = useState("slate")

    // Deleting State
    const [groupToDelete, setGroupToDelete] = useState<{ id: number; name: string; productCount?: number } | null>(null)

    const utils = trpc.useUtils()
    const groupsQuery = trpc.product.getGroups.useQuery(undefined, { enabled: open })

    const createMutation = trpc.product.createGroup.useMutation({
        onSuccess: (data) => {
            utils.product.getGroups.invalidate()
            utils.product.getAll.invalidate()
            toast.success(`Group "${data.name}" added successfully`)
            setNewGroupName("")
            if (onGroupSelected) onGroupSelected(data.name)
        },
        onError: (err) => toast.error(err.message)
    })

    const updateMutation = trpc.product.updateGroup.useMutation({
        onSuccess: (data) => {
            utils.product.getGroups.invalidate()
            utils.product.getAll.invalidate()
            toast.success(`Group "${data.name}" updated successfully`)
            setEditingGroupId(null)
        },
        onError: (err) => toast.error(err.message)
    })

    const deleteMutation = trpc.product.deleteGroup.useMutation({
        onSuccess: () => {
            utils.product.getGroups.invalidate()
            utils.product.getAll.invalidate()
            toast.success("Group deleted successfully")
            setGroupToDelete(null)
        },
        onError: (err) => {
            toast.error(err.message)
            setGroupToDelete(null)
        }
    })

    const handleCreateGroup = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGroupName.trim()) {
            toast.error("Please enter a group name")
            return
        }
        createMutation.mutate({
            name: newGroupName.trim(),
            color: newGroupColor,
        })
    }

    const handleStartEdit = (group: { id: number; name: string; color?: string | null }) => {
        setEditingGroupId(group.id)
        setEditName(group.name)
        setEditColor(group.color || "slate")
    }

    const handleSaveEdit = (id: number) => {
        if (!editName.trim()) {
            toast.error("Group name cannot be empty")
            return
        }
        updateMutation.mutate({
            id,
            name: editName.trim(),
            color: editColor,
        })
    }

    const groups = groupsQuery.data || []

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[540px]">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <HugeiconsIcon icon={Tag01Icon} className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle>Manage Product Groups</DialogTitle>
                                <DialogDescription>
                                    Add, edit, or customize product categories (e.g. Lubes, DEF, Coolants).
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Add New Group Section */}
                    <form onSubmit={handleCreateGroup} className="p-3 bg-muted/40 rounded-lg border space-y-3">
                        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Add New Group
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Group name (e.g. Coolants, Greases)"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                className="h-9 flex-1 text-sm bg-background"
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={!newGroupName.trim() || createMutation.isPending}
                            >
                                {createMutation.isPending ? (
                                    <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <HugeiconsIcon icon={PlusSignIcon} className="mr-1.5 h-4 w-4" />
                                        Add
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Color Selector Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-xs text-muted-foreground mr-1">Color:</span>
                            {GROUP_COLOR_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setNewGroupColor(opt.value)}
                                    className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1.5 border transition-all ${
                                        newGroupColor === opt.value
                                            ? 'ring-2 ring-primary ring-offset-1 font-semibold'
                                            : 'opacity-70 hover:opacity-100'
                                    } ${opt.badgeClass}`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${opt.dotClass}`} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </form>

                    {/* Groups List */}
                    <div className="space-y-2 mt-1">
                        <div className="flex justify-between items-center px-1">
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Existing Groups ({groups.length})
                            </Label>
                            {groupsQuery.isLoading && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <HugeiconsIcon icon={Loading03Icon} className="h-3 w-3 animate-spin" />
                                    Loading...
                                </span>
                            )}
                        </div>

                        <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                            {groups.map((group) => {
                                const isEditing = editingGroupId === group.id
                                const badgeStyle = getGroupBadgeStyle(isEditing ? editColor : group.color, isEditing ? editName : group.name)

                                return (
                                    <div
                                        key={group.id}
                                        className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors gap-2"
                                    >
                                        {isEditing ? (
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="h-8 text-sm"
                                                        placeholder="Group name"
                                                        autoFocus
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleSaveEdit(group.id)}
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
                                                        onClick={() => setEditingGroupId(null)}
                                                        title="Cancel"
                                                    >
                                                        <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-1 flex-wrap text-xs">
                                                    {GROUP_COLOR_OPTIONS.map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => setEditColor(opt.value)}
                                                            className={`px-1.5 py-0.5 rounded text-[11px] border ${
                                                                editColor === opt.value
                                                                    ? 'ring-1 ring-primary font-bold'
                                                                    : 'opacity-70'
                                                            } ${opt.badgeClass}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <Badge variant="outline" className={`text-xs capitalize font-medium ${badgeStyle}`}>
                                                        {group.name}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {group.productCount || 0} {group.productCount === 1 ? 'product' : 'products'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleStartEdit(group)}
                                                        title="Edit Group"
                                                    >
                                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setGroupToDelete(group)}
                                                        title="Delete Group"
                                                    >
                                                        <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            })}

                            {groups.length === 0 && !groupsQuery.isLoading && (
                                <div className="text-center py-6 text-sm text-muted-foreground">
                                    No groups found. Add your first group above.
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

            {/* Delete Group Confirmation Alert */}
            <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {groupToDelete && (groupToDelete.productCount ?? 0) > 0 ? (
                                <div className="space-y-2 mt-2">
                                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex gap-2">
                                        <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>
                                            Cannot delete <strong>&quot;{groupToDelete.name}&quot;</strong> because it is currently assigned to <strong>{groupToDelete.productCount}</strong> product(s). Please reassign or delete those products first.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    Are you sure you want to delete the group <strong>&quot;{groupToDelete?.name}&quot;</strong>? This action cannot be undone.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            {(groupToDelete?.productCount ?? 0) > 0 ? "Understood" : "Cancel"}
                        </AlertDialogCancel>
                        {(!groupToDelete || (groupToDelete.productCount ?? 0) === 0) && (
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => {
                                    if (groupToDelete) {
                                        deleteMutation.mutate({ id: groupToDelete.id })
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
