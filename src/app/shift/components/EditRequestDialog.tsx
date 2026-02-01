"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { HugeiconsIcon } from "@hugeicons/react"
import { LockKeyIcon, InformationCircleIcon } from "@hugeicons/core-free-icons"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"

interface EditRequestDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    shiftId: number
    shiftType?: string
    onSuccess: () => void
}

export function EditRequestDialog({ open, onOpenChange, shiftId, shiftType, onSuccess }: EditRequestDialogProps) {
    const [reason, setReason] = useState("")

    const requestMutation = trpc.shiftEditRequest.request.useMutation({
        onSuccess: () => {
            toast.success("Edit request sent successfully")
            setReason("")
            onSuccess()
            onOpenChange(false)
        },
        onError: (err) => {
            toast.error(err.message || "Failed to send edit request")
        }
    })

    const handleSubmit = () => {
        if (reason.length < 5) {
            toast.error("Please provide a reason (at least 5 characters)")
            return
        }
        requestMutation.mutate({ shiftId, reason })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={LockKeyIcon} className="h-5 w-5 text-primary" />
                        Request Edit Permission
                    </DialogTitle>
                    <DialogDescription>
                        This {shiftType?.toLowerCase() || ''} shift is verified and locked. Request permission from the shift owner to make edits.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Editing</Label>
                        <Textarea
                            id="reason"
                            placeholder="e.g., Corrections needed in fuel readings or payments..."
                            className="min-h-[100px]"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                            <HugeiconsIcon icon={InformationCircleIcon} className="h-3 w-3 mt-0.5 shrink-0" />
                            Once approved, the shift status will change to "Pending Review" and you will be able to edit it.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={requestMutation.isPending || reason.length < 5}
                    >
                        {requestMutation.isPending ? "Sending..." : "Send Request"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
