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
    Alert02Icon,
    ArrowLeft02Icon,
    TimeQuarterPassIcon,
    MoneyReceive01Icon,
    FuelStationIcon
} from "@hugeicons/core-free-icons"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Nozzle = {
    id: number
    code: string
    currentreading: number
    price: number
    fuel: {
        id: number
        name: string
    }
    dispenser: {
        id: number
        code: string
        name: string
    }
    isActive?: boolean
}

type NozzleReading = {
    id: number
    nozzleId: number
    openingReading: number
    testQty: number
    closingReading: number | null
    fuelDispensed: number
    nozzle: Nozzle
}

type PaymentMethod = {
    id: number
    name: string
    customerId?: number | null
    isActive?: boolean
}

type SessionPayment = {
    id: number
    paymentMethodId: number
    amount: number
    quantity: number | null
    paymentMethod: PaymentMethod
}

type DutySession = {
    id: number
    shiftName: string
    startTime: string
    endTime: string | null
    status: string
    totalPaymentCollected: number
    nozzleReadings: NozzleReading[]
    sessionPayments: SessionPayment[]
}

export default function ShiftPage() {
    const { user, accessToken } = useAuth()
    const [step, setStep] = useState(1)
    const [shiftName, setShiftName] = useState("")
    const [suggestedShiftName, setSuggestedShiftName] = useState("")
    const [availableNozzles, setAvailableNozzles] = useState<Nozzle[]>([])
    const [selectedNozzleIds, setSelectedNozzleIds] = useState<number[]>([])
    const [currentSession, setCurrentSession] = useState<DutySession | null>(null)
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [newPayment, setNewPayment] = useState({ methodId: "", amount: "" })
    const [elapsedTime, setElapsedTime] = useState(0)
    const [loading, setLoading] = useState(false)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const autoSaveRef = useRef<NodeJS.Timeout | null>(null)

    // Fetch initial data
    useEffect(() => {
        if (accessToken) {
            fetchSuggestedShiftName()
            fetchNozzles()
            fetchPaymentMethods()
            checkActiveSession()
        }
    }, [accessToken])

    // Timer for active shift
    useEffect(() => {
        if (currentSession && step === 3) {
            timerRef.current = setInterval(() => {
                const start = new Date(currentSession.startTime).getTime()
                const now = new Date().getTime()
                setElapsedTime(Math.floor((now - start) / 1000))
            }, 1000)

            return () => {
                if (timerRef.current) clearInterval(timerRef.current)
            }
        }
    }, [currentSession, step])

    const fetchSuggestedShiftName = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shifts/generate-shift-name`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            })
            const data = await res.json()
            if (res.ok) {
                setSuggestedShiftName(data.shiftName)
                setShiftName(data.shiftName)
            }
        } catch (error) {
            console.error('Failed to generate shift name:', error)
        }
    }

    const fetchNozzles = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/nozzles`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            const data = await res.json()
            if (res.ok) {
                setAvailableNozzles(data.filter((n: Nozzle) => n.isActive))
            }
        } catch (error) {
            console.error('Failed to fetch nozzles:', error)
        }
    }

    const fetchPaymentMethods = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payment-methods`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            const data = await res.json()
            if (res.ok) {
                setPaymentMethods(data.filter((pm: PaymentMethod) => pm.isActive ?? true))
            }
        } catch (error) {
            console.error('Failed to fetch payment methods:', error)
        }
    }

    const checkActiveSession = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shifts/my-sessions?status=in_progress&limit=1`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            })
            const data = await res.json()
            if (res.ok && data.sessions && data.sessions.length > 0) {
                // User has an active session, fetch full details
                const sessionRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shifts/${data.sessions[0].id}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                })
                const sessionData = await sessionRes.json()
                if (sessionRes.ok) {
                    setCurrentSession(sessionData)
                    setStep(3) // Jump to active shift dashboard
                }
            }
        } catch (error) {
            console.error('Failed to check active session:', error)
        }
    }

    const handleStartShift = async () => {
        if (!shiftName.trim()) {
            toast.error("Error", {
                description: "Shift name is required"
            })
            return
        }

        if (selectedNozzleIds.length === 0) {
            toast.error("Error", {
                description: "Please select at least one nozzle"
            })
            return
        }

        setLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shifts/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    shiftName: shiftName.trim(),
                    nozzleIds: selectedNozzleIds
                })
            })

            const data = await res.json()
            if (res.ok) {
                setCurrentSession(data)
                setStep(2)
                toast.success("Success", {
                    description: "Shift started successfully"
                })
            } else {
                toast.error("Error", {
                    description: data.error || "Failed to start shift"
                })
            }
        } catch (error) {
            toast.error("Error", {
                description: "Failed to start shift"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateTestQty = async (readingId: number, testQty: number) => {
        if (!currentSession) return

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/shifts/${currentSession.id}/nozzle/${readingId}/test-qty`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ testQty })
                }
            )

            if (res.ok) {
                const updatedReading = await res.json()
                setCurrentSession({
                    ...currentSession,
                    nozzleReadings: currentSession.nozzleReadings.map(r =>
                        r.id === readingId ? updatedReading : r
                    )
                })
            }
        } catch (error) {
            console.error('Failed to update test qty:', error)
        }
    }

    const handleConfirmReadings = () => {
        setStep(3)
        toast("Shift Active", {
            description: "Opening readings confirmed. You can now manage your shift."
        })
    }

    const handleAddPayment = async () => {
        if (!currentSession || !newPayment.methodId || !newPayment.amount) {
            toast.error("Error", {
                description: "Please select payment method and enter amount"
            })
            return
        }

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/shifts/${currentSession.id}/add-payment`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        paymentMethodId: parseInt(newPayment.methodId),
                        amount: parseFloat(newPayment.amount)
                    })
                }
            )

            const data = await res.json()
            if (res.ok) {
                setCurrentSession({
                    ...currentSession,
                    sessionPayments: data.payments,
                    totalPaymentCollected: data.totalPaymentCollected
                })
                setNewPayment({ methodId: "", amount: "" })
                toast.success("Success", {
                    description: `Payment of ₹${newPayment.amount} added`
                })
            } else {
                toast.error("Error", {
                    description: data.error || "Failed to add payment"
                })
            }
        } catch (error) {
            toast.error("Error", {
                description: "Failed to add payment"
            })
        }
    }

    const handleDeletePayment = async (paymentId: number) => {
        if (!currentSession) return

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/shifts/${currentSession.id}/payment/${paymentId}`,
                {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            )

            const data = await res.json()
            if (res.ok) {
                setCurrentSession({
                    ...currentSession,
                    sessionPayments: data.payments,
                    totalPaymentCollected: data.totalPaymentCollected
                })
                toast.success("Success", {
                    description: "Payment removed"
                })
            }
        } catch (error) {
            toast.error("Error", {
                description: "Failed to remove payment"
            })
        }
    }

    const handleUpdateClosingReading = async (readingId: number, closingReading: number) => {
        if (!currentSession) return

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/shifts/${currentSession.id}/nozzle/${readingId}/closing-reading`,
                {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ closingReading })
                }
            )

            if (res.ok) {
                const updatedReading = await res.json()
                setCurrentSession({
                    ...currentSession,
                    nozzleReadings: currentSession.nozzleReadings.map(r =>
                        r.id === readingId ? updatedReading : r
                    )
                })
                toast.success("Success", {
                    description: "Closing reading updated"
                })
            } else {
                const data = await res.json()
                toast.error("Error", {
                    description: data.error || "Invalid closing reading"
                })
            }
        } catch (error) {
            toast.error("Error", {
                description: "Failed to update closing reading"
            })
        }
    }

    const handlePreview = async () => {
        if (!currentSession) return

        // Check if at least one closing reading exists
        const hasClosing = currentSession.nozzleReadings.some(r => r.closingReading !== null)
        if (!hasClosing) {
            toast.error("Error", {
                description: "Please enter at least one closing reading before proceeding"
            })
            return
        }

        setStep(4)
    }

    const [previewData, setPreviewData] = useState<any>(null)

    useEffect(() => {
        if (step === 4 && currentSession) {
            fetchPreview()
        }
    }, [step, currentSession])

    const fetchPreview = async () => {
        if (!currentSession) return

        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/shifts/${currentSession.id}/preview`,
                {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                }
            )

            if (res.ok) {
                const data = await res.json()
                setPreviewData(data)
            }
        } catch (error) {
            console.error('Failed to fetch preview:', error)
        }
    }

    const [closingNotes, setClosingNotes] = useState("")

    const handleSubmitShift = async () => {
        if (!currentSession) return

        setLoading(true)
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/shifts/${currentSession.id}/submit`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ closingNotes })
                }
            )

            const data = await res.json()
            if (res.ok) {
                setStep(5)
                toast.success("Success", {
                    description: "Shift submitted successfully"
                })
            } else {
                toast.error("Error", {
                    description: data.error || "Failed to submit shift"
                })
            }
        } catch (error) {
            toast.error("Error", {
                description: "Failed to submit shift"
            })
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    }

    const toggleNozzleSelection = (nozzleId: number) => {
        setSelectedNozzleIds(prev =>
            prev.includes(nozzleId)
                ? prev.filter(id => id !== nozzleId)
                : [...prev, nozzleId]
        )
    }

    const progressValue = (step / 5) * 100

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
            {step === 1 && (
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
                                    You can customize the shift name or use the suggested one
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Label>Select Nozzles</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {availableNozzles.map((nozzle) => (
                                        <Card
                                            key={nozzle.id}
                                            className={`cursor-pointer transition-all ${selectedNozzleIds.includes(nozzle.id)
                                                ? 'ring-2 ring-primary bg-primary/5'
                                                : 'hover:bg-accent'
                                                }`}
                                            onClick={() => toggleNozzleSelection(nozzle.id)}
                                        >
                                            <CardContent className="p-2">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Badge variant="outline" className="h-4 px-1 text-[10px] shrink-0">{nozzle.code}</Badge>
                                                            <span className="font-medium text-xs truncate">{nozzle.fuel.name}</span>
                                                        </div>
                                                        {selectedNozzleIds.includes(nozzle.id) && (
                                                            <HugeiconsIcon
                                                                icon={CheckmarkCircle02Icon}
                                                                className="h-4 w-4 text-primary shrink-0"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="flex items-baseline justify-between text-[10px] text-muted-foreground leading-none">
                                                        <span>{nozzle.dispenser.code}</span>
                                                        <span className="font-medium text-foreground">₹{nozzle.price.toFixed(2)}</span>
                                                    </div>

                                                    <p className="text-xs font-medium leading-none mt-0.5">
                                                        {nozzle.currentreading.toFixed(1)} L
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
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

            {/* Step 2: Opening Readings Verification */}
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
                            {currentSession.nozzleReadings.map((reading) => (
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
                        <Button
                            variant="outline"
                            onClick={() => setStep(1)}
                        >
                            <HugeiconsIcon icon={ArrowLeft02Icon} className="mr-2 h-4 w-4" />
                            Back
                        </Button>
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
                                        {formatTime(elapsedTime)} elapsed
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
                            {currentSession.nozzleReadings.map((reading) => (
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
                                                >
                                                    Save
                                                </Button>
                                            </div>
                                        </div>

                                        {reading.closingReading !== null && (
                                            <div className="pt-2 border-t">
                                                <p className="text-sm text-muted-foreground">Fuel Dispensed</p>
                                                <p className="text-xl font-bold text-primary">
                                                    {parseFloat(reading.fuelDispensed.toString()).toFixed(2)} L
                                                </p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Right: Payments */}
                        <div className="md:col-span-2 space-y-4">
                            <div className="sticky top-4 space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <HugeiconsIcon icon={MoneyReceive01Icon} />
                                    Payments Collected
                                </h3>

                                <Card>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="paymentMethod">Payment Method</Label>
                                            <select
                                                id="paymentMethod"
                                                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                value={newPayment.methodId}
                                                onChange={(e) => setNewPayment({ ...newPayment, methodId: e.target.value })}
                                            >
                                                <option value="">Select method</option>
                                                {paymentMethods.map((pm) => (
                                                    <option key={pm.id} value={pm.id}>
                                                        {pm.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="amount">Amount (₹)</Label>
                                            <Input
                                                id="amount"
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={newPayment.amount}
                                                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                            />
                                        </div>

                                        <Button onClick={handleAddPayment} className="w-full">
                                            Add Payment
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Payment History</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0 space-y-2">
                                        {currentSession.sessionPayments.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No payments recorded</p>
                                        ) : (
                                            currentSession.sessionPayments.map((payment) => (
                                                <div
                                                    key={payment.id}
                                                    className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                                                >
                                                    <div>
                                                        <p className="font-medium">{payment.paymentMethod.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            ₹{parseFloat(payment.amount.toString()).toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeletePayment(payment.id)}
                                                    >
                                                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-primary text-primary-foreground">
                                    <CardContent className="p-6 text-center">
                                        <p className="text-sm opacity-90">Total Collected</p>
                                        <p className="text-4xl font-bold mt-2">
                                            ₹{parseFloat(currentSession.totalPaymentCollected.toString()).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>

                                <div className="flex gap-3">
                                    <Button variant="outline" onClick={() => setStep(2)} size="lg">
                                        <HugeiconsIcon icon={ArrowLeft02Icon} className="mr-2 h-4 w-4" />
                                        Back
                                    </Button>
                                    <Button onClick={handlePreview} className="flex-1" size="lg">
                                        End Shift & Review
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Preview */}
            {step === 4 && previewData && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Review Shift Summary</CardTitle>
                            <CardDescription>
                                Please review all details before submitting
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Shift Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Shift Name</p>
                                    <p className="font-medium">{previewData.shiftName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Start Time</p>
                                    <p className="font-medium">
                                        {new Date(previewData.startTime).toLocaleString('en-IN', {
                                            dateStyle: 'short',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Duration</p>
                                    <p className="font-medium">{formatTime(elapsedTime)}</p>
                                </div>
                            </div>

                            <Separator />

                            {/* Nozzle Details */}
                            <div>
                                <h3 className="font-semibold mb-3">Nozzle Breakdown</h3>
                                <div className="space-y-3">
                                    {previewData.nozzleReadings.map((reading: NozzleReading) => (
                                        <Card key={reading.id} className="bg-muted/30">
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge>{reading.nozzle.code}</Badge>
                                                        <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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
                                                    <div>
                                                        <p className="text-muted-foreground">Closing</p>
                                                        <p className="font-medium">
                                                            {reading.closingReading !== null
                                                                ? parseFloat(reading.closingReading.toString()).toFixed(2)
                                                                : "N/A"} L
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Dispensed</p>
                                                        <p className="font-bold text-primary">
                                                            {parseFloat(reading.fuelDispensed.toString()).toFixed(2)} L
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Price/L</p>
                                                        <p className="font-medium">
                                                            ₹{parseFloat(reading.nozzle.price.toString()).toFixed(2)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Expected Revenue</p>
                                                        <p className="font-medium">
                                                            ₹{(parseFloat(reading.fuelDispensed.toString()) * parseFloat(reading.nozzle.price.toString())).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Payment Breakdown */}
                            <div>
                                <h3 className="font-semibold mb-3">Payment Breakdown</h3>
                                <div className="space-y-2">
                                    {previewData.sessionPayments.map((payment: SessionPayment) => (
                                        <div key={payment.id} className="flex justify-between p-2 rounded bg-muted/50">
                                            <span>{payment.paymentMethod.name}</span>
                                            <span className="font-medium">
                                                ₹{parseFloat(payment.amount.toString()).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="bg-blue-50 dark:bg-blue-950/20">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-muted-foreground">Total Fuel Dispensed</p>
                                        <p className="text-2xl font-bold">
                                            {parseFloat(previewData.metrics.totalFuelDispensed.toString()).toFixed(2)} L
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-green-50 dark:bg-green-950/20">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-muted-foreground">Expected Revenue</p>
                                        <p className="text-2xl font-bold">
                                            ₹{parseFloat(previewData.metrics.expectedRevenue.toString()).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-primary/10">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-muted-foreground">Actual Revenue</p>
                                        <p className="text-2xl font-bold">
                                            ₹{parseFloat(previewData.metrics.actualRevenue.toString()).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>
                                <Card className={`${parseFloat(previewData.metrics.discrepancy.toString()) !== 0
                                    ? 'bg-orange-50 dark:bg-orange-950/20'
                                    : 'bg-gray-50 dark:bg-gray-950/20'
                                    }`}>
                                    <CardContent className="p-4">
                                        <p className="text-sm text-muted-foreground">Discrepancy</p>
                                        <p className={`text-2xl font-bold ${parseFloat(previewData.metrics.discrepancy.toString()) !== 0
                                            ? 'text-orange-600 dark:text-orange-400'
                                            : ''
                                            }`}>
                                            ₹{parseFloat(previewData.metrics.discrepancy.toString()).toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Closing Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    placeholder="Add notes about any discrepancies or issues..."
                                    value={closingNotes}
                                    onChange={(e) => setClosingNotes(e.target.value)}
                                    rows={4}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(3)}>
                            <HugeiconsIcon icon={ArrowLeft02Icon} className="mr-2 h-4 w-4" />
                            Edit Shift
                        </Button>
                        <Button
                            onClick={handleSubmitShift}
                            className="flex-1"
                            disabled={loading}
                            variant={parseFloat(previewData.metrics.discrepancy.toString()) !== 0 ? "destructive" : "default"}
                        >
                            {loading ? "Submitting..." : "Confirm & Submit"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 5: Completion */}
            {step === 5 && (
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Card className="w-full max-w-2xl">
                        <CardContent className="p-8 text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="h-24 w-24 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                    <HugeiconsIcon
                                        icon={CheckmarkCircle02Icon}
                                        className="h-12 w-12 text-green-600 dark:text-green-400 animate-bounce-in"
                                    />
                                </div>
                            </div>

                            <div>
                                <h2 className="text-3xl font-bold mb-2">Shift Submitted Successfully!</h2>
                                <p className="text-muted-foreground">
                                    Your shift has been completed and locked
                                </p>
                            </div>

                            {previewData && (
                                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Shift</p>
                                            <p className="font-medium">{previewData.shiftName}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Duration</p>
                                            <p className="font-medium">{formatTime(elapsedTime)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Fuel Dispensed</p>
                                            <p className="font-medium">
                                                {parseFloat(previewData.metrics.totalFuelDispensed.toString()).toFixed(2)} L
                                            </p>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-center">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Total Payment Collected</p>
                                            <p className="text-3xl font-bold text-primary">
                                                ₹{parseFloat(previewData.metrics.actualRevenue.toString()).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Alert>
                                <HugeiconsIcon icon={LockIcon} className="h-4 w-4" />
                                <AlertDescription>
                                    This shift is now locked and cannot be edited.
                                </AlertDescription>
                            </Alert>

                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => {
                                        setStep(1)
                                        setCurrentSession(null)
                                        setSelectedNozzleIds([])
                                        setClosingNotes("")
                                        fetchSuggestedShiftName()
                                    }}
                                    className="w-full"
                                >
                                    Start New Shift
                                </Button>
                                <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
                                    Return to Dashboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
