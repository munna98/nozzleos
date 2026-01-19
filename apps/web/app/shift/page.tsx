"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    CheckmarkCircle02Icon,
    LockIcon,
    Delete02Icon,
    PencilEdit01Icon,
    Alert02Icon,
    ArrowLeft02Icon,
    TimeQuarterPassIcon,
    MoneyReceive01Icon,
    FuelStationIcon
} from "@hugeicons/core-free-icons"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { trpc } from "@/lib/trpc"

export default function ShiftPage() {
    const { user } = useAuth()
    const [step, setStep] = useState(1)
    const [shiftName, setShiftName] = useState("")
    const [selectedNozzleIds, setSelectedNozzleIds] = useState<number[]>([])
    const [elapsedTime, setElapsedTime] = useState(0)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    // Data Queries
    const utils = trpc.useUtils()
    const suggestedNameQuery = trpc.shift.generateShiftName.useQuery(undefined, {
        enabled: step === 1,
    })
    const nozzlesQuery = trpc.nozzle.getAll.useQuery()
    const paymentMethodsQuery = trpc.paymentMethod.getAll.useQuery()
    const activeShiftQuery = trpc.shift.getActive.useQuery(undefined, {
        retry: false
    })

    const summaryQuery = (trpc.shift as any).getSummary.useQuery(
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
            setNewPayment({ methodId: "", amount: "" })
        },
        onError: (error: any) => toast.error(error.message)
    })

    const updatePaymentMutation = (trpc.shift as any).updatePayment.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            toast.success("Payment updated")
            handleCancelEdit()
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


    // Local State for forms
    const [newPayment, setNewPayment] = useState({ methodId: "", amount: "" })
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)
    const [closingNotes, setClosingNotes] = useState("")
    const [finalShortage, setFinalShortage] = useState<number | null>(null)

    // Effects
    useEffect(() => {
        if (suggestedNameQuery.data) {
            setShiftName(suggestedNameQuery.data.shiftName)
        }
    }, [suggestedNameQuery.data])

    // Check for active session and restore state
    useEffect(() => {
        if (activeShiftQuery.data && step === 1) {
            setStep(3)
        }
    }, [activeShiftQuery.data, step])

    // Timer
    useEffect(() => {
        if (activeShiftQuery.data && step === 3) {
            timerRef.current = setInterval(() => {
                const start = new Date(activeShiftQuery.data.startTime).getTime()
                const now = new Date().getTime()
                setElapsedTime(Math.floor((now - start) / 1000))
            }, 1000)

            return () => {
                if (timerRef.current) clearInterval(timerRef.current)
            }
        }
    }, [activeShiftQuery.data, step])


    // Handlers
    const handleStartShift = () => {
        if (!shiftName.trim()) return toast.error("Shift name required")
        if (selectedNozzleIds.length === 0) return toast.error("Select at least one nozzle")

        startShiftMutation.mutate({
            shiftName,
            nozzleIds: selectedNozzleIds
        })
    }

    const handleConfirmReadings = () => {
        setStep(3)
        toast("Shift Active", {
            description: "Opening readings confirmed. You can now manage your shift."
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

    const handleAddPayment = () => {
        if (!activeShiftQuery.data || !newPayment.methodId || !newPayment.amount) {
            return toast.error("Please enter details")
        }

        const payload = {
            shiftId: activeShiftQuery.data.id,
            data: {
                paymentMethodId: parseInt(newPayment.methodId),
                amount: parseFloat(newPayment.amount)
            }
        }

        if (editingPaymentId) {
            updatePaymentMutation.mutate({
                ...payload,
                paymentId: editingPaymentId
            })
        } else {
            addPaymentMutation.mutate({
                ...payload,
                data: payload.data // addPaymentSchema matches
            })
        }
    }

    const handleEditPayment = (payment: any) => {
        setNewPayment({
            methodId: payment.paymentMethodId.toString(),
            amount: payment.amount.toString()
        })
        setEditingPaymentId(payment.id)
    }

    const handleCancelEdit = () => {
        setNewPayment({ methodId: "", amount: "" })
        setEditingPaymentId(null)
    }

    const handleDeletePayment = (paymentId: number) => {
        if (!activeShiftQuery.data) return
        if (confirm("Are you sure?")) {
            deletePaymentMutation.mutate({
                shiftId: activeShiftQuery.data.id,
                paymentId
            })
        }
    }

    const handlePreview = () => {
        if (!activeShiftQuery.data) return
        const hasClosing = activeShiftQuery.data.nozzleReadings.some((r: any) => r.closingReading !== null)
        if (!hasClosing) {
            return toast.error("Enter at least one closing reading")
        }
        setStep(4)
    }

    const handleSubmitShift = () => {
        if (!activeShiftQuery.data) return
        // Save the shortage value before completing
        if (summaryQuery.data) {
            setFinalShortage(summaryQuery.data.shortage)
        }
        completeShiftMutation.mutate({
            shiftId: activeShiftQuery.data.id,
            data: { notes: closingNotes }
        })
    }


    const availableNozzles = nozzlesQuery.data?.filter(n => n.isActive) || []
    const loading = startShiftMutation.isPending || activeShiftQuery.isLoading

    const toggleNozzleSelection = (nozzleId: number) => {
        setSelectedNozzleIds(prev =>
            prev.includes(nozzleId)
                ? prev.filter(id => id !== nozzleId)
                : [...prev, nozzleId]
        )
    }

    const progressValue = (step / 5) * 100

    // Derived Data
    const currentSession = activeShiftQuery.data

    return (
        <div className="container mx-auto py-6 px-4 max-w-7xl">
            {/* Progress Indicator */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-medium text-muted-foreground">
                        Step {step} of 5
                    </h2>
                </div>
                <Progress value={progressValue} className="h-2" />
            </div>

            {/* Step 1: Shift Initialization */}
            {step === 1 && !currentSession && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Start New Shift</CardTitle>
                            <CardDescription>
                                {new Date().toLocaleString('en-IN', {
                                    dateStyle: 'full',
                                    timeStyle: 'short'
                                })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="shiftName">Shift Name</Label>
                                <Input
                                    id="shiftName"
                                    value={shiftName}
                                    onChange={(e) => setShiftName(e.target.value)}
                                    placeholder="Enter shift name"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Enter a shift name or use the suggested one
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label>Select Nozzles</Label>
                                {nozzlesQuery.isLoading ? (
                                    <div>Loading nozzles...</div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {availableNozzles.map((nozzle) => {
                                            const isUnavailable = !nozzle.isAvailable
                                            return (
                                                <Card
                                                    key={nozzle.id}
                                                    className={`transition-all relative overflow-hidden ${selectedNozzleIds.includes(nozzle.id)
                                                        ? 'ring-2 ring-primary bg-primary/5'
                                                        : isUnavailable
                                                            ? 'opacity-60 bg-muted cursor-not-allowed'
                                                            : 'cursor-pointer hover:bg-accent'
                                                        }`}
                                                    onClick={() => !isUnavailable && toggleNozzleSelection(nozzle.id)}
                                                >
                                                    {isUnavailable && (
                                                        <div className="absolute top-0 right-0 z-10 p-1">
                                                            <Badge variant="destructive" className="text-[10px] px-1 h-5">In Use</Badge>
                                                        </div>
                                                    )}
                                                    <CardContent className="p-2">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                    <Badge variant="outline" className="h-4 px-1 text-[10px] shrink-0">{nozzle.code}</Badge>
                                                                    <span className="font-medium text-xs truncate">{nozzle.fuel?.name}</span>
                                                                </div>
                                                                {selectedNozzleIds.includes(nozzle.id) && (
                                                                    <HugeiconsIcon
                                                                        icon={CheckmarkCircle02Icon}
                                                                        className="h-4 w-4 text-primary shrink-0"
                                                                    />
                                                                )}
                                                            </div>

                                                            <div className="flex items-baseline justify-between text-[10px] text-muted-foreground leading-none">
                                                                <span>{nozzle.dispenser?.code}</span>
                                                                <span className="font-medium text-foreground">₹{nozzle.price.toFixed(2)}</span>
                                                            </div>

                                                            <p className="text-xs font-medium leading-none mt-0.5">
                                                                {nozzle.currentreading.toFixed(1)} L
                                                            </p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )
                                        })}
                                    </div>
                                )}
                                {selectedNozzleIds.length === 0 && (
                                    <Alert>
                                        <HugeiconsIcon icon={Alert02Icon} className="h-4 w-4" />
                                        <AlertDescription>
                                            Select at least 1 nozzle to continue
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        onClick={handleStartShift}
                        className="w-full md:w-auto"
                        disabled={loading || selectedNozzleIds.length === 0 || !shiftName.trim()}
                    >
                        {loading ? "Starting..." : "Start Shift"}
                    </Button>
                </div>
            )}

            {/* Step 2: Opening Readings Verification (Active Session needed) */}
            {step === 2 && currentSession && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Verify Opening Readings</CardTitle>
                            <CardDescription>
                                These readings are locked and cannot be changed
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {currentSession.nozzleReadings.map((reading: any) => (
                                <Card key={reading.id} className="bg-muted/50">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge>{reading.nozzle.code}</Badge>
                                                <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                            </div>
                                            <HugeiconsIcon icon={LockIcon} className="h-4 w-4 text-muted-foreground" />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-muted-foreground">Opening Reading (Locked)</Label>
                                                <p className="text-lg font-medium">
                                                    {parseFloat(reading.openingReading.toString()).toFixed(2)} L
                                                </p>
                                            </div>

                                            <div>
                                                <Label htmlFor={`test-${reading.id}`}>
                                                    Test Qty (Optional)
                                                </Label>
                                                <Input
                                                    id={`test-${reading.id}`}
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    defaultValue={parseFloat(reading.testQty.toString())}
                                                    onBlur={(e) => {
                                                        const value = parseFloat(e.target.value) || 0
                                                        handleUpdateTestQty(reading.id, value)
                                                    }}
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Liters used for nozzle function test
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        {/* We don't really support back to step 1 from an active session nicely because it's already started. 
                             Unless we delete the session, which is not implemented in UI. 
                         */}
                        <Button onClick={handleConfirmReadings} className="flex-1">
                            Confirm & Begin Shift
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Active Shift Dashboard */}
            {step === 3 && currentSession && (
                <div className="space-y-6">
                    {/* Header */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{currentSession.shiftName}</CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <HugeiconsIcon icon={TimeQuarterPassIcon} className="h-4 w-4" />
                                        {Math.floor(elapsedTime / 3600).toString().padStart(2, '0')}:{Math.floor((elapsedTime % 3600) / 60).toString().padStart(2, '0')} elapsed
                                    </CardDescription>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Nozzles: {currentSession.nozzleReadings.length}</p>
                                    <p className="text-sm text-muted-foreground">Payments: {currentSession.sessionPayments?.length || 0}</p>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        {/* Left: Nozzles */}
                        <div className="md:col-span-3 space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <HugeiconsIcon icon={FuelStationIcon} />
                                Nozzle Readings
                            </h3>
                            {currentSession.nozzleReadings.map((reading: any) => (
                                <Card key={reading.id}>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge>{reading.nozzle.code}</Badge>
                                                <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                            </div>
                                            {reading.closingReading !== null && (
                                                <Badge variant="default" className="bg-green-500">
                                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-1 h-3 w-3" />
                                                    Complete
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <p className="text-muted-foreground">Opening</p>
                                                <p className="font-medium">
                                                    {parseFloat(reading.openingReading.toString()).toFixed(2)} L
                                                </p>
                                            </div>
                                            {reading.testQty > 0 && (
                                                <div>
                                                    <p className="text-muted-foreground">Test Qty</p>
                                                    <p className="font-medium">
                                                        {parseFloat(reading.testQty.toString()).toFixed(2)} L
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor={`closing-${reading.id}`}>Closing Reading</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id={`closing-${reading.id}`}
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Enter closing reading"
                                                    defaultValue={
                                                        reading.closingReading !== null
                                                            ? parseFloat(reading.closingReading.toString())
                                                            : ""
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const value = parseFloat(e.currentTarget.value)
                                                            if (!isNaN(value)) {
                                                                handleUpdateClosingReading(reading.id, value)
                                                            }
                                                        }
                                                    }}
                                                />
                                                <Button
                                                    onClick={() => {
                                                        const input = document.getElementById(`closing-${reading.id}`) as HTMLInputElement
                                                        const value = parseFloat(input.value)
                                                        if (!isNaN(value)) {
                                                            handleUpdateClosingReading(reading.id, value)
                                                        }
                                                    }}
                                                    size="icon"
                                                >
                                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Right: Payments */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <HugeiconsIcon icon={MoneyReceive01Icon} />
                                    Payments Collected
                                </h3>

                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">Add Payment</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-2">
                                            <Label>Payment Method</Label>
                                            <select
                                                className="w-full flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={newPayment.methodId}
                                                onChange={(e) => setNewPayment({ ...newPayment, methodId: e.target.value })}
                                            >
                                                <option value="">Select Method</option>
                                                {paymentMethodsQuery.data?.map(pm => (
                                                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Amount</Label>
                                            <Input
                                                type="number"
                                                value={newPayment.amount}
                                                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            {editingPaymentId && (
                                                <Button variant="outline" className="flex-1" onClick={handleCancelEdit}>
                                                    Cancel
                                                </Button>
                                            )}
                                            <Button className="flex-1" onClick={handleAddPayment} disabled={addPaymentMutation.isPending || updatePaymentMutation.isPending}>
                                                {editingPaymentId ? "Update" : "Add"} Payment
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-muted-foreground">Payment History</p>
                                    {currentSession.sessionPayments?.map((payment: any) => (
                                        <Card key={payment.id} className="relative overflow-hidden">
                                            <CardContent className="py-0 px-3 flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{payment.paymentMethod.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(payment.createdAt).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <p className="font-bold text-lg">₹{payment.amount}</p>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditPayment(payment)}>
                                                            <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePayment(payment.id)}>
                                                            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {(!currentSession.sessionPayments || currentSession.sessionPayments.length === 0) && (
                                        <p className="text-center text-muted-foreground text-sm py-4">
                                            No payments recorded yet.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Total Amount */}
                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="p-6">
                                    <p className="text-3xl font-bold text-primary text-center">
                                        ₹{(currentSession.sessionPayments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0).toFixed(2)}
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="pt-6 border-t">
                                <Button className="w-full" size="lg" onClick={handlePreview}>
                                    Finish Shift
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Preview and Submit */}
            {step === 4 && summaryQuery.data && (
                <div className="space-y-6 max-w-4xl mx-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Shift Summary</CardTitle>
                            <CardDescription>Review details before submitting</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <p className="text-muted-foreground mb-1">Total Fuel Sales</p>
                                        <p className="text-2xl font-bold">₹{summaryQuery.data.totalFuelSales.toFixed(2)}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <p className="text-muted-foreground mb-1">Total Collected</p>
                                        <p className="text-2xl font-bold">₹{summaryQuery.data.totalCollected.toFixed(2)}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-4 text-center">
                                        <p className="text-muted-foreground mb-1">Shortage / Excess</p>
                                        <p className={`text-2xl font-bold ${summaryQuery.data.shortage > 0 ? 'text-green-600' : summaryQuery.data.shortage < 0 ? 'text-red-600' : ''}`}>
                                            {summaryQuery.data.shortage > 0 ? '+' : summaryQuery.data.shortage < 0 ? '-' : ''}₹{Math.abs(summaryQuery.data.shortage).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Separator />

                            {/* Nozzle-wise Breakdown */}
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <HugeiconsIcon icon={FuelStationIcon} className="h-4 w-4" />
                                    Fuel Sales Breakdown
                                </h3>
                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Nozzle</th>
                                                <th className="text-left p-3 font-medium">Fuel</th>
                                                <th className="text-right p-3 font-medium">Qty (L)</th>
                                                <th className="text-right p-3 font-medium">Rate</th>
                                                <th className="text-right p-3 font-medium">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summaryQuery.data.nozzleReadings.map((reading: any) => (
                                                <tr key={reading.id} className="border-t">
                                                    <td className="p-3">
                                                        <Badge variant="outline">{reading.nozzle.code}</Badge>
                                                    </td>
                                                    <td className="p-3">{reading.nozzle.fuel.name}</td>
                                                    <td className="p-3 text-right font-medium">
                                                        {parseFloat(reading.fuelDispensed?.toString() || '0').toFixed(2)}
                                                    </td>
                                                    <td className="p-3 text-right text-muted-foreground">
                                                        ₹{reading.price.toFixed(2)}
                                                    </td>
                                                    <td className="p-3 text-right font-medium">
                                                        ₹{reading.amount.toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="border-t bg-muted/30 font-medium">
                                                <td colSpan={4} className="p-3 text-right">Total Fuel Sales</td>
                                                <td className="p-3 text-right">₹{summaryQuery.data.totalFuelSales.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Payment-wise Breakdown */}
                            <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <HugeiconsIcon icon={MoneyReceive01Icon} className="h-4 w-4" />
                                    Payments Breakdown
                                </h3>
                                <div className="rounded-md border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left p-3 font-medium">Payment Method</th>
                                                <th className="text-right p-3 font-medium">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {summaryQuery.data.sessionPayments.map((payment: any) => (
                                                <tr key={payment.id} className="border-t">
                                                    <td className="p-3">{payment.paymentMethod.name}</td>
                                                    <td className="p-3 text-right font-medium">₹{parseFloat(payment.amount).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            {summaryQuery.data.sessionPayments.length === 0 && (
                                                <tr className="border-t">
                                                    <td colSpan={2} className="p-3 text-center text-muted-foreground">No payments recorded</td>
                                                </tr>
                                            )}
                                            <tr className="border-t bg-muted/30 font-medium">
                                                <td className="p-3 text-right">Total Collected</td>
                                                <td className="p-3 text-right">₹{summaryQuery.data.totalCollected.toFixed(2)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label>Closing Notes (Optional)</Label>
                                <Textarea
                                    value={closingNotes}
                                    onChange={(e) => setClosingNotes(e.target.value)}
                                    placeholder="Enter any notes about this shift..."
                                />
                            </div>

                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setStep(3)}>
                                    Back to Editing
                                </Button>
                                <Button className="flex-1" onClick={handleSubmitShift} disabled={completeShiftMutation.isPending}>
                                    {completeShiftMutation.isPending ? "Submitting..." : "Submit Shift"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Step 5: Success */}
            {step === 5 && (
                <div className="max-w-md mx-auto py-10 text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold">Shift Submitted!</h2>
                    {finalShortage !== null && (
                        <p className={`text-3xl font-bold ${finalShortage > 0 ? 'text-green-600' : finalShortage < 0 ? 'text-red-600' : ''}`}>
                            {finalShortage > 0 ? '+' : finalShortage < 0 ? '-' : ''}₹{Math.abs(finalShortage).toFixed(2)}
                        </p>
                    )}
                    <p className="text-muted-foreground">
                        Your shift record has been saved successfully.
                    </p>
                    <Button onClick={() => {
                        setStep(1)
                        // Invalidate to clear active shift
                        utils.shift.getActive.invalidate()
                        // Ensure step 1 queries re-run
                        setShiftName("")
                        setSelectedNozzleIds([])
                        setFinalShortage(null)
                    }} className="mt-4">
                        Start New Shift
                    </Button>
                </div>
            )}
        </div>
    )
}
