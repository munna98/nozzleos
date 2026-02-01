"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit01Icon, UserCircleIcon, Calendar01Icon } from "@hugeicons/core-free-icons"
import { trpc } from "@/lib/trpc"
import { toast } from "sonner"

interface EditRequestReviewDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    request: any // Type from tRPC output
    onSuccess: () => void
}

export function EditRequestReviewDialog({ open, onOpenChange, request, onSuccess }: EditRequestReviewDialogProps) {
    const approveMutation = trpc.shiftEditRequest.approve.useMutation({
        onSuccess: () => {
            toast.success("Edit request approved")
            onSuccess()
            onOpenChange(false)
        },
        onError: (err) => {
            toast.error(err.message || "Failed to approve request")
        }
    })

    if (!request) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-5 w-5 text-primary" />
                        Review Edit Request
                    </DialogTitle>
                    <DialogDescription>
                        An administrator is requesting permission to edit your verified shift.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                            <HugeiconsIcon icon={UserCircleIcon} className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">Requested by:</span>
                            <span>{request.requestedByUser.name || request.requestedByUser.username}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <HugeiconsIcon icon={Calendar01Icon} className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-foreground">Requested on:</span>
                            <span>{new Date(request.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col gap-1 text-sm border-t pt-2 mt-2">
                            <span className="font-medium text-foreground">Reason for edit:</span>
                            <p className="text-muted-foreground italic bg-background/50 p-2 rounded border border-dashed">
                                "{request.reason}"
                            </p>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md text-xs text-yellow-700 dark:text-yellow-400">
                        <p className="font-semibold mb-1">What happens if you approve?</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>The shift status will change from "Verified" back to "Pending Review".</li>
                            <li>Administrators will be able to make changes to readings and payments.</li>
                            <li>The shift must be re-verified after edits are completed.</li>
                        </ul>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Not Now
                    </Button>
                    <Button
                        onClick={() => approveMutation.mutate({ requestId: request.id })}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {approveMutation.isPending ? "Approving..." : "Approve Edits"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
