"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { useAuth } from "@/lib/auth-context"
import { ShiftHistoryList } from "./components/ShiftHistoryList"
import { ShiftDetailView } from "./components/ShiftDetailView"
import { ShiftEditModal } from "./components/ShiftEditModal"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

export default function ShiftHistoryPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user } = useAuth()
    const isAdmin = user?.role === 'Admin' || user?.role === 'Manager'

    const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
    const [editingShiftId, setEditingShiftId] = useState<number | null>(null)
    const [activeTab, setActiveTab] = useState("all")

    // Initialize tab from URL hash/search if needed, or default to pending if admin has pending shifts? 
    // For now simple default 'all' unless admin, maybe 'pending' if admin?
    // Let's keep 'all' as default but allows switching.

    // Auto-switch to pending tab if there are pending shifts? No, let's keep it manual for now.

    useEffect(() => {
        if (searchParams.get('tab')) {
            setActiveTab(searchParams.get('tab')!)
        } else if (isAdmin) {
            // Optional: defaulting to pending if admin?
            // setActiveTab("pending")
        }
    }, [searchParams, isAdmin])

    const [page, setPage] = useState(0)
    const limit = 10

    // Determine status filter based on tab
    const statusFilter = activeTab === 'pending' ? 'pending_verification' : undefined

    // Fetch shifts
    const shiftsQuery = trpc.shift.getAll.useQuery({
        limit,
        offset: page * limit,
        status: statusFilter,
    })

    // Separate query for pending count (for badge)
    const pendingCountQuery = trpc.shift.getPendingVerification.useQuery({ limit: 0, offset: 0 }, {
        enabled: isAdmin,
        refetchInterval: 30000 // Refresh every 30s
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
        // Refresh list when closing detail to reflect any status changes
        shiftsQuery.refetch()
        if (isAdmin) pendingCountQuery.refetch()
    }

    const handleCloseEdit = () => {
        setEditingShiftId(null)
        // Refetch the shift details and list after editing
        shiftDetailQuery.refetch()
        shiftsQuery.refetch()
    }

    const onVerifySuccess = () => {
        // Refresh everything on verification
        shiftDetailQuery.refetch()
        shiftsQuery.refetch()
        if (isAdmin) pendingCountQuery.refetch()
    }

    const handleVerifyShift = (shiftId: number) => {
        // We'll set the selected shift ID briefly to trigger the detail view verification logic?
        // No, we should probably have a direct mutation here or reuse the detail view logic.
        // Better to expose the verification mutation here.
        // But ShiftDetailView already has the mutation logic. 
        // Let's create a quick verify mutation here or open the detail view in verify mode?
        // The request was "quick verify option".
        // Let's implement the mutation directly here.
        verifyMutation.mutate({
            shiftId,
            approved: true
        })
    }

    const utils = trpc.useUtils()
    const verifyMutation = trpc.shift.verifyShift.useMutation({
        onSuccess: () => {
            // Toast removed since we don't have toast imported here yet, or we should import it
            // Let's import toast
            utils.shift.invalidate()
        }
    })

    // Show detail view if a shift is selected
    if (selectedShiftId) {
        if (shiftDetailQuery.isLoading) {
            return (
                <div className="container mx-auto py-6 px-4 max-w-4xl flex items-center justify-center min-h-[50vh]">
                    <Spinner className="size-8" />
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
                        onVerifySuccess={onVerifySuccess}
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
        <div className="container mx-auto py-10 space-y-6 px-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                    <HugeiconsIcon icon={ArrowLeft01Icon} className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Shift History</h2>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(val) => {
                setActiveTab(val)
                setPage(0) // Reset page when switching tabs
            }} className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="all">All Shifts</TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="pending" className="gap-2">
                            Pending Verification
                            {pendingCountQuery.data?.pagination.total ? (
                                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                    {pendingCountQuery.data.pagination.total}
                                </Badge>
                            ) : null}
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="all" className="mt-0 space-y-6">
                    {/* Shift List Content - All */}
                    {activeTab === 'all' && <ShiftListContent query={shiftsQuery} isAdmin={isAdmin} onViewShift={handleViewShift} onVerifyShift={handleVerifyShift} page={page} setPage={setPage} limit={limit} />}
                </TabsContent>

                <TabsContent value="pending" className="mt-0 space-y-6">
                    {/* Shift List Content - Pending */}
                    {activeTab === 'pending' && <ShiftListContent query={shiftsQuery} isAdmin={isAdmin} onViewShift={handleViewShift} onVerifyShift={handleVerifyShift} page={page} setPage={setPage} limit={limit} />}
                </TabsContent>
            </Tabs>
        </div>
    )
}

function ShiftListContent({ query, isAdmin, onViewShift, onVerifyShift, page, setPage, limit }: any) {
    if (query.isLoading) {
        return <div className="text-center py-12"><Spinner className="size-6 mx-auto" /></div>
    }

    if (query.data?.sessions.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No shifts found.
            </div>
        )
    }

    return (
        <>
            <ShiftHistoryList
                shifts={query.data?.sessions || []}
                isAdmin={isAdmin}
                onViewShift={onViewShift}
                onVerifyShift={onVerifyShift}
            />

            {/* Pagination */}
            {query.data && query.data.pagination.total > limit && (
                <div className="flex justify-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        onClick={() => setPage((p: number) => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                        Page {page + 1} of {Math.ceil(query.data.pagination.total / limit)}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage((p: number) => p + 1)}
                        disabled={(page + 1) * limit >= query.data.pagination.total}
                    >
                        Next
                    </Button>
                </div>
            )}
        </>
    )
}
