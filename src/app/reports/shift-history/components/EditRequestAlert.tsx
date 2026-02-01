"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { InformationCircleIcon, LockKeyIcon } from "@hugeicons/core-free-icons"

interface EditRequestAlertProps {
    request: {
        id: number
        reason: string
        requestedByUser: {
            name: string | null
            username: string
        }
    }
    onReviewClick: () => void
}

export function EditRequestAlert({ request, onReviewClick }: EditRequestAlertProps) {
    return (
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10 dark:border-yellow-900/30 mb-4 animate-in fade-in slide-in-from-top-2">
            <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <div>
                    <AlertTitle className="text-yellow-800 dark:text-yellow-300 font-semibold mb-1">
                        Edit Permission Requested
                    </AlertTitle>
                    <AlertDescription className="text-yellow-700 dark:text-yellow-400/80 text-xs sm:text-sm">
                        Admin <strong>{request.requestedByUser.name || request.requestedByUser.username}</strong> is requesting to edit this verified shift.
                    </AlertDescription>
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onReviewClick}
                    className="border-yellow-300 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30 h-8 gap-1.5"
                >
                    <HugeiconsIcon icon={LockKeyIcon} className="h-3.5 w-3.5" />
                    Review & Approve
                </Button>
            </div>
        </Alert>
    )
}
