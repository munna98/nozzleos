"use client"

import { useState, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick01Icon, Delete02Icon, Add01Icon } from "@hugeicons/core-free-icons"

interface ShiftEditModalProps {
    shiftId: number
    isOpen: boolean
    onClose: () => void
}

export function ShiftEditModal({ shiftId, isOpen, onClose }: ShiftEditModalProps) {
    const utils = trpc.useUtils()

    // Fetch shift details
    const shiftQuery = trpc.shift.getById.useQuery(
        { id: shiftId },
        { enabled: isOpen }
    )

    // Fetch payment methods for adding new payments
    const paymentMethodsQuery = trpc.paymentMethod.getAll.useQuery()

    // Mutations
    const updateShiftMutation = trpc.shift.adminUpdateShift.useMutation({
        onSuccess: () => {
            toast.success("Shift updated")
            utils.shift.getById.invalidate({ id: shiftId })
        },
        onError: (error) => toast.error(error.message)
    })

    const updateNozzleReadingMutation = trpc.shift.adminUpdateNozzleReading.useMutation({
        onSuccess: () => {
            toast.success("Reading updated")
            utils.shift.getById.invalidate({ id: shiftId })
        },
        onError: (error) => toast.error(error.message)
    })

    const addPaymentMutation = trpc.shift.adminAddPayment.useMutation({
        onSuccess: () => {
            toast.success("Payment added")
            utils.shift.getById.invalidate({ id: shiftId })
            setNewPayment({ methodId: 0, amount: '' })
        },
        onError: (error) => toast.error(error.message)
    })

    const updatePaymentMutation = trpc.shift.adminUpdatePayment.useMutation({
        onSuccess: () => {
            toast.success("Payment updated")
            utils.shift.getById.invalidate({ id: shiftId })
        },
        onError: (error) => toast.error(error.message)
    })

    const deletePaymentMutation = trpc.shift.adminDeletePayment.useMutation({
        onSuccess: () => {
            toast.success("Payment deleted")
            utils.shift.getById.invalidate({ id: shiftId })
        },
        onError: (error) => toast.error(error.message)
    })

    // Local state for editing
    const [shiftDetails, setShiftDetails] = useState({
        shiftName: '',
        notes: '',
        status: '' as 'in_progress' | 'completed' | 'archived'
    })

    const [newPayment, setNewPayment] = useState({
        methodId: 0,
        amount: ''
    })

    // Update local state when shift data loads
    useEffect(() => {
        if (shiftQuery.data) {
            setShiftDetails({
                shiftName: shiftQuery.data.shiftName,
                notes: shiftQuery.data.notes || '',
                status: shiftQuery.data.status as 'in_progress' | 'completed' | 'archived'
            })
        }
    }, [shiftQuery.data])

    const handleUpdateShiftDetails = () => {
        updateShiftMutation.mutate({
            shiftId,
            data: {
                shiftName: shiftDetails.shiftName,
                notes: shiftDetails.notes || undefined,
                status: shiftDetails.status
            }
        })
    }

    const handleUpdateNozzleReading = (readingId: number, field: 'openingReading' | 'closingReading' | 'testQty', value: string) => {
        const numValue = parseFloat(value)
        if (isNaN(numValue)) return

        updateNozzleReadingMutation.mutate({
            shiftId,
            readingId,
            data: { [field]: numValue }
        })
    }

    const handleAddPayment = () => {
        if (!newPayment.methodId || !newPayment.amount) {
            toast.error("Select a payment method and enter an amount")
            return
        }

        addPaymentMutation.mutate({
            shiftId,
            data: {
                paymentMethodId: newPayment.methodId,
                amount: parseFloat(newPayment.amount)
            }
        })
    }

    const handleUpdatePayment = (paymentId: number, amount: string) => {
        const numValue = parseFloat(amount)
        if (isNaN(numValue)) return

        updatePaymentMutation.mutate({
            shiftId,
            paymentId,
            data: { amount: numValue }
        })
    }

    const handleDeletePayment = (paymentId: number) => {
        if (confirm("Delete this payment?")) {
            deletePaymentMutation.mutate({ shiftId, paymentId })
        }
    }

    if (!shiftQuery.data) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl">
                    <div className="py-12 text-center text-muted-foreground">
                        Loading...
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    const shift = shiftQuery.data

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Shift</DialogTitle>
                    <DialogDescription>
                        Modify shift details, nozzle readings, and payments
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="readings">Nozzle Readings</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                    </TabsList>

                    {/* Shift Details Tab */}
                    <TabsContent value="details" className="space-y-4 mt-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Shift Name</Label>
                                <Input
                                    value={shiftDetails.shiftName}
                                    onChange={(e) => setShiftDetails(prev => ({ ...prev, shiftName: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={shiftDetails.status}
                                    onValueChange={(v) => setShiftDetails(prev => ({ ...prev, status: v as any }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Textarea
                                    value={shiftDetails.notes}
                                    onChange={(e) => setShiftDetails(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Enter notes..."
                                    rows={3}
                                />
                            </div>

                            <Button onClick={handleUpdateShiftDetails} disabled={updateShiftMutation.isPending}>
                                {updateShiftMutation.isPending ? 'Saving...' : 'Save Details'}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Nozzle Readings Tab */}
                    <TabsContent value="readings" className="space-y-4 mt-4">
                        {shift.nozzleReadings.map((reading: any) => (
                            <Card key={reading.id}>
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Badge variant="outline">{reading.nozzle.code}</Badge>
                                        <span className="text-muted-foreground font-normal">
                                            {reading.nozzle.fuel.name}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-3">
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs">Opening Reading</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                defaultValue={parseFloat(reading.openingReading?.toString() || '0')}
                                                onBlur={(e) => handleUpdateNozzleReading(reading.id, 'openingReading', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Closing Reading</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                defaultValue={reading.closingReading ? parseFloat(reading.closingReading.toString()) : ''}
                                                onBlur={(e) => handleUpdateNozzleReading(reading.id, 'closingReading', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs">Test Qty</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                defaultValue={parseFloat(reading.testQty?.toString() || '0')}
                                                onBlur={(e) => handleUpdateNozzleReading(reading.id, 'testQty', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    {/* Payments Tab */}
                    <TabsContent value="payments" className="space-y-4 mt-4">
                        {/* Existing Payments */}
                        {shift.sessionPayments.map((payment: any) => (
                            <div key={payment.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{payment.paymentMethod.name}</p>
                                </div>
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="w-32"
                                    defaultValue={parseFloat(payment.amount.toString())}
                                    onBlur={(e) => handleUpdatePayment(payment.id, e.target.value)}
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => handleDeletePayment(payment.id)}
                                >
                                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}

                        {/* Add New Payment */}
                        <Card>
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm">Add New Payment</CardTitle>
                            </CardHeader>
                            <CardContent className="py-3">
                                <div className="flex items-end gap-3">
                                    <div className="flex-1 space-y-2">
                                        <Label className="text-xs">Payment Method</Label>
                                        <Select
                                            value={newPayment.methodId ? String(newPayment.methodId) : ''}
                                            onValueChange={(v) => setNewPayment(prev => ({ ...prev, methodId: parseInt(v) }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {paymentMethodsQuery.data?.map((method: any) => (
                                                    <SelectItem key={method.id} value={String(method.id)}>
                                                        {method.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="w-32 space-y-2">
                                        <Label className="text-xs">Amount</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="₹0.00"
                                            value={newPayment.amount}
                                            onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                                        />
                                    </div>
                                    <Button onClick={handleAddPayment} disabled={addPaymentMutation.isPending}>
                                        <HugeiconsIcon icon={Add01Icon} className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                <div className="flex justify-end mt-6">
                    <Button variant="outline" onClick={onClose}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
