"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc"
import { useAuth } from "@/lib/auth-context"
import { ShiftHistoryList } from "./components/ShiftHistoryList"
import { ShiftDetailView } from "./components/ShiftDetailView"
import { ShiftEditModal } from "./components/ShiftEditModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { useRouter } from "next/navigation"

export default function ShiftHistoryPage() {
    const router = useRouter()
    const { user } = useAuth()
    const isAdmin = user?.role === 'Admin'

    const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
    const [editingShiftId, setEditingShiftId] = useState<number | null>(null)

    const [page, setPage] = useState(0)
    const limit = 10

    // Fetch shifts
    const shiftsQuery = trpc.shift.getAll.useQuery({
        limit,
        offset: page * limit,
        status: undefined, // Fetch all history
    })

    // Fetch single shift details
    const shiftDetailQuery = trpc.shift.getById.useQuery(
        { id: selectedShiftId! },
        { enabled: !!selectedShiftId }
    )

    const handleViewShift = (shiftId: number) => {
        setSelectedShiftId(shiftId)
    }

    const handleEditShift = (shiftId: number) => {
        setEditingShiftId(shiftId)
    }

    const handleCloseDetail = () => {
        setSelectedShiftId(null)
    }

    const handleCloseEdit = () => {
        setEditingShiftId(null)
        // Refetch the shift details and list after editing
        shiftDetailQuery.refetch()
        shiftsQuery.refetch()
    }

    // Show detail view if a shift is selected
    // Show detail view if a shift is selected
    if (selectedShiftId) {
        if (shiftDetailQuery.isLoading) {
            return (
                <div className="container mx-auto py-6 px-4 max-w-4xl flex items-center justify-center min-h-[50vh]">
                    <div className="text-muted-foreground">Loading shift details...</div>
                </div>
            )
        }

        if (shiftDetailQuery.error) {
            return (
                <div className="container mx-auto py-6 px-4 max-w-4xl flex flex-col items-center justify-center min-h-[50vh] gap-4">
                    <div className="text-destructive font-medium">Error loading details</div>
                    <div className="text-muted-foreground text-sm">{shiftDetailQuery.error.message}</div>
                    <Button variant="outline" onClick={handleCloseDetail}>
                        Go Back
                    </Button>
                </div>
            )
        }

        if (shiftDetailQuery.data) {
            return (
                <div className="container mx-auto py-6 px-4 max-w-4xl">
                    <ShiftDetailView
                        shift={shiftDetailQuery.data}
                        isAdmin={isAdmin}
                        onBack={handleCloseDetail}
                        onEdit={() => handleEditShift(selectedShiftId)}
                    />

                    {/* Edit Modal */}
                    {editingShiftId && (
                        <ShiftEditModal
                            shiftId={editingShiftId}
                            isOpen={!!editingShiftId}
                            onClose={handleCloseEdit}
                        />
                    )}
                </div>
            )
        }
    }

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Shift History</h2>
                </div>
            </div>



            {/* Shift List */}
            {shiftsQuery.isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading shifts...</div>
            ) : shiftsQuery.data?.sessions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    No shifts found.
                </div>
            ) : (
                <>
                    <ShiftHistoryList
                        shifts={shiftsQuery.data?.sessions || []}
                        isAdmin={isAdmin}
                        onViewShift={handleViewShift}
                    />

                    {/* Pagination */}
                    {shiftsQuery.data && shiftsQuery.data.pagination.total > limit && (
                        <div className="flex justify-center gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center px-4 text-sm text-muted-foreground">
                                Page {page + 1} of {Math.ceil(shiftsQuery.data.pagination.total / limit)}
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * limit >= shiftsQuery.data.pagination.total}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
