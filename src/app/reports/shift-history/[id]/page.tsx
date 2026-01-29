"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { trpc } from "@/lib/trpc"
import { useAuth } from "@/lib/auth-context"
import { ShiftDetailView } from "../components/ShiftDetailView"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"

export default function ShiftDetailPage() {
    const params = useParams()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const isAdmin = user?.role === 'Admin' || user?.role === 'Manager'
    const shiftId = Number(params.id)
    const source = searchParams.get('source')

    const shiftDetailQuery = trpc.shift.getById.useQuery(
        { id: shiftId },
        { enabled: !!shiftId }
    )

    const handleBack = () => {
        if (source === 'dashboard') {
            router.push('/dashboard')
        } else {
            router.push('/reports/shift-history')
        }
    }

    if (shiftDetailQuery.isLoading) {
        return (
            <div className="container mx-auto py-6 px-4 flex items-center justify-center min-h-[50vh]">
                <Spinner className="size-8" />
            </div>
        )
    }

    if (shiftDetailQuery.error || !shiftDetailQuery.data) {
        return (
            <div className="container mx-auto py-6 px-4 flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <div className="text-destructive font-medium">Error loading details</div>
                <div className="text-muted-foreground text-sm">{shiftDetailQuery.error?.message || "Shift not found"}</div>
                <Button variant="outline" onClick={() => router.push('/reports/shift-history')}>
                    Go Back to List
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 px-4 max-w-5xl">
            <ShiftDetailView
                shift={shiftDetailQuery.data}
                isAdmin={isAdmin}
                onBack={handleBack}
                onVerifySuccess={() => shiftDetailQuery.refetch()}
            />
        </div>
    )
}
