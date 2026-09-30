"use client"

import { useParams, useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { useAuth } from "@/lib/auth-context"
import { ShiftEditDashboard } from "./ShiftEditDashboard"

export default function ShiftEditPage() {
    const params = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const isAdmin = user?.role === 'Admin' || user?.role === 'Manager'
    const shiftId = parseInt(params.id as string)

    const shiftQuery = trpc.shift.getById.useQuery(
        { id: shiftId },
        { enabled: !!shiftId }
    )

    if (shiftQuery.isLoading) {
        return (
            <div className="container mx-auto py-6 px-4 flex items-center justify-center min-h-[50vh]">
                <Spinner className="size-8" />
            </div>
        )
    }

    if (shiftQuery.error || !shiftQuery.data) {
        return (
            <div className="container mx-auto py-6 px-4 flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="text-destructive font-medium">Error loading details</div>
                <div className="text-muted-foreground text-sm">{shiftQuery.error?.message || "Shift not found"}</div>
                <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        )
    }

    // Permission check
    const isOwner = shiftQuery.data.userId === user?.id
    const isRejected = shiftQuery.data.status === 'rejected'

    if (!isAdmin && !(isOwner && isRejected)) {
        return (
            <div className="container mx-auto py-6 px-4 flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="text-destructive font-medium">Access Denied</div>
                <div className="text-muted-foreground text-sm">You do not have permission to edit this shift. Only rejected shifts can be edited by attendants.</div>
                <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 px-4 max-w-7xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Editing {shiftQuery.data.type.charAt(0) + shiftQuery.data.type.slice(1).toLowerCase()} Shift of {shiftQuery.data.user?.name || shiftQuery.data.user?.username}
                    </h1>
                </div>
            </div>

            <ShiftEditDashboard
                shift={shiftQuery.data}
                isAdmin={isAdmin}
                currentUserId={user?.id}
            />
        </div>
    )
}
