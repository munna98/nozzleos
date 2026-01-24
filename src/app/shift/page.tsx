"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { trpc } from "@/lib/trpc"
import { useRouter } from "next/navigation"

import { ShiftStartStep } from "./components/ShiftStartStep"
import { ShiftVerificationStep } from "./components/ShiftVerificationStep"
import { ShiftDashboardStep } from "./components/ShiftDashboardStep"
import { ShiftSummaryStep } from "./components/ShiftSummaryStep"
import { ShiftSuccessStep } from "./components/ShiftSuccessStep"
import { ShiftType } from "@prisma/client"

export default function ShiftPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [shiftType, setShiftType] = useState<ShiftType>(ShiftType.MORNING)
    const [selectedNozzleIds, setSelectedNozzleIds] = useState<number[]>([])
    const [elapsedTime, setElapsedTime] = useState(0)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Data Queries
    const utils = trpc.useUtils()
    const activeShiftQuery = trpc.shift.getActive.useQuery(undefined, {
        retry: false
    })
    const paymentMethodsQuery = trpc.paymentMethod.getAll.useQuery()
    const settingsQuery = trpc.settings.get.useQuery()
    const denominationsQuery = trpc.denomination.getAll.useQuery()

    const summaryQuery = trpc.shift.getSummary.useQuery(
        { shiftId: activeShiftQuery.data?.id || 0 },
        { enabled: (step === 4 || step === 5) && !!activeShiftQuery.data }
    )

    // Mutations
    const startShiftMutation = trpc.shift.start.useMutation({
        onSuccess: (data) => {
            utils.shift.getActive.invalidate()
            utils.nozzle.getAll.invalidate() // Nozzles become unavailable
            toast.success("Shift started successfully")
            setStep(2) // Move to verify readings
        },
        onError: (error: any) => toast.error(error.message)
    })

    const updateReadingMutation = trpc.shift.updateNozzleReading.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
        },
        onError: (error: any) => toast.error(error.message)
    })

    const addPaymentMutation = trpc.shift.addPayment.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            toast.success("Payment added")
        },
        onError: (error: any) => toast.error(error.message)
    })

    const updatePaymentMutation = trpc.shift.updatePayment.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            toast.success("Payment updated")
        },
        onError: (error: any) => toast.error(error.message)
    })

    const deletePaymentMutation = trpc.shift.deletePayment.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            toast.success("Payment removed")
        },
        onError: (error: any) => toast.error(error.message)
    })

    const completeShiftMutation = trpc.shift.complete.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.nozzle.getAll.invalidate()
            toast.success("Shift submitted successfully")
            setStep(5)
        },
        onError: (error: any) => toast.error(error.message)
    })


    // Effects
    // Check for active session and restore state
    useEffect(() => {
        if (activeShiftQuery.data && (step === 1 || step === 5)) {
            // Determine step based on session state?
            // Usually if active session exists, we go to dashboard (step 3) or verify (step 2)
            // But we don't know if verification passed. 
            // For now, if session exists, assume we are in the flow.
            // If we are at step 1, jump to 3.
            if (step === 1) setStep(3)
        }
    }, [activeShiftQuery.data, step])

    // Timer
    useEffect(() => {
        if (activeShiftQuery.data && (step === 3 || step === 2)) {
            const updateTimer = () => {
                const start = new Date(activeShiftQuery.data!.startTime).getTime()
                const now = new Date().getTime()
                setElapsedTime(Math.floor((now - start) / 1000))
            }
            updateTimer() // Initial call
            timerRef.current = setInterval(updateTimer, 1000)

            return () => {
                if (timerRef.current) clearInterval(timerRef.current)
            }
        }
    }, [activeShiftQuery.data, step])

    // Handlers
    const handleStartShift = () => {
        if (selectedNozzleIds.length === 0) return toast.error("Select at least one nozzle")

        startShiftMutation.mutate({
            shiftType,
            nozzleIds: selectedNozzleIds
        })
    }

    const handleUpdateTestQty = (readingId: number, testQty: number) => {
        if (!activeShiftQuery.data) return
        updateReadingMutation.mutate({
            shiftId: activeShiftQuery.data.id,
            data: { nozzleReadingId: readingId, testQty }
        })
    }

    const handleUpdateClosingReading = (readingId: number, closingReading: number) => {
        if (!activeShiftQuery.data) return

        // Find the reading to validate
        const reading = activeShiftQuery.data.nozzleReadings.find((r: any) => r.id === readingId)
        if (reading) {
            const openingReading = parseFloat(reading.openingReading.toString())
            if (closingReading <= openingReading) {
                return toast.error("Closing reading must be greater than opening reading")
            }
        }

        updateReadingMutation.mutate({
            shiftId: activeShiftQuery.data.id,
            data: { nozzleReadingId: readingId, closingReading }
        })
    }

    const handleAddOrUpdatePayment = (data: {
        methodId: number;
        amount: number;
        paymentId?: number;
        denominations?: { denominationId: number; count: number }[];
        coinsAmount?: number;
    }) => {
        if (!activeShiftQuery.data) return

        if (data.paymentId) {
            updatePaymentMutation.mutate({
                paymentId: data.paymentId,
                paymentMethodId: data.methodId,
                amount: data.amount
            })
        } else {
            addPaymentMutation.mutate({
                shiftId: activeShiftQuery.data.id,
                paymentMethodId: data.methodId,
                amount: data.amount,
                denominations: data.denominations,
                coinsAmount: data.coinsAmount
            })
        }
    }

    const handleDeletePayment = (paymentId: number) => {
        if (!activeShiftQuery.data) return
        if (confirm("Are you sure?")) {
            deletePaymentMutation.mutate({
                paymentId
            })
        }
    }

    const handleFinishShiftAttempt = () => {
        if (!activeShiftQuery.data) return
        const hasClosing = activeShiftQuery.data.nozzleReadings.some((r: any) => r.closingReading !== null)
        if (!hasClosing) {
            return toast.error("Enter at least one closing reading")
        }
        setStep(4)
    }

    const handleSubmitShift = (notes: string) => {
        if (!activeShiftQuery.data) return
        completeShiftMutation.mutate({
            shiftId: activeShiftQuery.data.id,
            notes
        })
    }

    const progressValue = (step / 5) * 100
    const currentSession = activeShiftQuery.data

    return (
        <div className="container mx-auto py-6 px-4 max-w-7xl">
            {/* Progress Indicator */}
            {step < 5 && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-medium text-muted-foreground">
                            Step {step} of 5
                        </h2>
                    </div>
                    <Progress value={progressValue} className="h-2" />
                </div>
            )}

            {step === 1 && !currentSession && (
                <ShiftStartStep
                    shiftType={shiftType}
                    setShiftType={setShiftType}
                    selectedNozzleIds={selectedNozzleIds}
                    setSelectedNozzleIds={setSelectedNozzleIds}
                    onStart={handleStartShift}
                    isStarting={startShiftMutation.isPending}
                />
            )}

            {step === 2 && currentSession && (
                <ShiftVerificationStep
                    session={currentSession}
                    onUpdateTestQty={handleUpdateTestQty}
                    onConfirm={() => {
                        setStep(3)
                        toast("Shift Active", {
                            description: "Opening readings confirmed. You can now manage your shift."
                        })
                    }}
                />
            )}

            {step === 3 && currentSession && paymentMethodsQuery.data && (
                <ShiftDashboardStep
                    session={currentSession}
                    elapsedTime={elapsedTime}
                    paymentMethods={paymentMethodsQuery.data}
                    denominations={denominationsQuery.data}
                    settings={settingsQuery.data}
                    onUpdateClosingReading={handleUpdateClosingReading}
                    onUpdateTestQty={handleUpdateTestQty}
                    onAddPayment={handleAddOrUpdatePayment}
                    onDeletePayment={handleDeletePayment}
                    onFinishShift={handleFinishShiftAttempt}
                />
            )}

            {step === 4 && summaryQuery.data && (
                <ShiftSummaryStep
                    summary={summaryQuery.data}
                    onBack={() => setStep(3)}
                    onSubmit={handleSubmitShift}
                    isSubmitting={completeShiftMutation.isPending}
                />
            )}

            {step === 5 && (
                <ShiftSuccessStep onHome={() => router.push('/')} />
            )}
        </div>
    )
}
