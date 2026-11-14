"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    CheckmarkCircle02Icon,
    FuelStationIcon,
    MoneyReceive01Icon,
    TimeQuarterPassIcon,
    PencilEdit01Icon,
    Delete02Icon,
    Cancel01Icon,
    PlusSignIcon,
    InformationCircleIcon,
    ArrowDown01Icon,
    ArrowUp01Icon,
    Loading03Icon,
    PackageIcon
} from "@hugeicons/core-free-icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AmountTape } from "@/components/ui/amount-tape"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { inferRouterOutputs } from "@trpc/server"
import { trpc } from "@/lib/trpc"
import type { AppRouter } from "@/server/trpc/router"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

type RouterOutputs = inferRouterOutputs<AppRouter>
type ShiftSession = NonNullable<RouterOutputs['shift']['getActive']>
type PaymentMethod = RouterOutputs['paymentMethod']['getAll'][number]
type NozzleReading = ShiftSession['nozzleReadings'][number]
type SessionPayment = NonNullable<ShiftSession['sessionPayments']>[number]
type Denomination = RouterOutputs['denomination']['getAll'][number]
type Settings = RouterOutputs['settings']['get']
type ShiftSummary = RouterOutputs['shift']['getSummary']
type SessionProduct = NonNullable<ShiftSession['sessionProducts']>[number]
type Product = RouterOutputs['product']['getAll'][number]

// Pre-calculate totals for grouping
interface PaymentMethodSummary {
    methodId: number
    methodName: string
    totalAmount: number
    count: number
    payments: SessionPayment[]
}

interface DenominationCount {
    denominationId: number
    count: number
}

interface PaymentData {
    methodId: number
    amount: number
    paymentId?: number
    staffId?: number | null
    denominations?: DenominationCount[]
    coinsAmount?: number
}

interface ShiftDashboardStepProps {
    session: ShiftSession
    elapsedTime: number
    paymentMethods: PaymentMethod[]
    denominations?: Denomination[]
    settings?: Settings | null
    onUpdateClosingReading: (readingId: number, closingReading: number) => Promise<any>
    onUpdateTestQty: (readingId: number, testQty: number) => Promise<any>
    onAddPayment: (data: PaymentData) => Promise<any>
    onDeletePayment: (paymentId: number) => Promise<any>
    onReview: () => void  // Was onFinishShift
    onSubmit: () => void
    isSubmitting?: boolean
    summary?: ShiftSummary
    isAdmin?: boolean
}

export function ShiftDashboardStep({
    session,
    elapsedTime,
    paymentMethods,
    denominations = [],
    settings,
    onUpdateClosingReading,
    onUpdateTestQty,
    onAddPayment,
    onDeletePayment,
    onReview,
    onSubmit,
    isSubmitting,
    summary,
    isAdmin,
}: ShiftDashboardStepProps) {
    const { user } = useAuth()
    const effectiveIsAdmin = isAdmin !== undefined ? isAdmin : (user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Super Admin')
    const activeStaffQuery = trpc.user.getActiveStaff.useQuery()
    const activeStaffList = activeStaffQuery.data || []

    const [selectedMethodId, setSelectedMethodId] = useState("")
    const [selectedStaffId, setSelectedStaffId] = useState<string>("")
    const [manualAmount, setManualAmount] = useState("")
    const [denominationCounts, setDenominationCounts] = useState<Record<number, number>>({})
    const [coinsAmount, setCoinsAmount] = useState("")
    const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null)
    const [expandedPaymentId, setExpandedPaymentId] = useState<number | null>(null)
    // Pine Labs tape state
    const [tapeResetKey, setTapeResetKey] = useState(0)
    const [tapeTotal, setTapeTotal] = useState(0)
    const handleTapeChange = useCallback((total: number) => setTapeTotal(total), [])

    const [editingTestQtyId, setEditingTestQtyId] = useState<number | null>(null)
    const [updatingClosingReadingId, setUpdatingClosingReadingId] = useState<number | null>(null)
    const [updatingTestQtyId, setUpdatingTestQtyId] = useState<number | null>(null)
    const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)
    const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null)
    const [paymentToDelete, setPaymentToDelete] = useState<SessionPayment | null>(null)

    const paymentFormRef = useRef<HTMLDivElement>(null)
    const manualAmountRef = useRef<HTMLInputElement>(null)

    // Add Nozzle State
    const [isAddNozzleOpen, setIsAddNozzleOpen] = useState(false)
    const [selectedNozzleToAdd, setSelectedNozzleToAdd] = useState<string>("")
    // Remove Nozzle State
    const [nozzleToRemove, setNozzleToRemove] = useState<NozzleReading | null>(null)
    const [isRemoveNozzleOpen, setIsRemoveNozzleOpen] = useState(false)

    const utils = trpc.useUtils()
    const availableNozzlesQuery = trpc.nozzle.getAvailable.useQuery(undefined, {
        enabled: isAddNozzleOpen
    })
    const addNozzleMutation = trpc.shift.addNozzle.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.shift.getSummary.invalidate()
            utils.nozzle.getAll.invalidate()
            utils.nozzle.getAvailable.invalidate()
            toast.success("Nozzle added to shift")
            setIsAddNozzleOpen(false)
            setSelectedNozzleToAdd("")
        },
        onError: (error) => toast.error(error.message)
    })

    const removeNozzleMutation = trpc.shift.removeNozzle.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.shift.getSummary.invalidate()
            utils.nozzle.getAll.invalidate()
            utils.nozzle.getAvailable.invalidate()
            toast.success("Nozzle removed from shift")
            setIsRemoveNozzleOpen(false)
            setNozzleToRemove(null)
        },
        onError: (error) => toast.error(error.message)
    })

    const handleAddNozzle = () => {
        if (!selectedNozzleToAdd) return
        addNozzleMutation.mutate({
            shiftId: session.id,
            nozzleId: parseInt(selectedNozzleToAdd)
        })
    }

    const handleRemoveNozzleClick = (reading: NozzleReading) => {
        if (session.nozzleReadings.length <= 1) {
            toast.error("Cannot remove the last nozzle")
            return
        }
        setNozzleToRemove(reading)
        setIsRemoveNozzleOpen(true)
    }

    // Product Sales State
    const [isAddProductOpen, setIsAddProductOpen] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState<string>("")
    const [saleQuantity, setSaleQuantity] = useState<string>("1")
    const [customPrice, setCustomPrice] = useState<string>("")
    const [editingProductSale, setEditingProductSale] = useState<SessionProduct | null>(null)
    const [productSaleToDelete, setProductSaleToDelete] = useState<SessionProduct | null>(null)
    const [deletingProductSaleId, setDeletingProductSaleId] = useState<number | null>(null)

    const productsQuery = trpc.product.getAll.useQuery({ activeOnly: true })
    const availableProducts = productsQuery.data || []

    const selectedProduct = useMemo(() => {
        return availableProducts.find((p: Product) => p.id.toString() === selectedProductId)
    }, [availableProducts, selectedProductId])

    const addProductSaleMutation = trpc.shift.addProductSale.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.shift.getSummary.invalidate()
            toast.success("Product sale recorded")
            setIsAddProductOpen(false)
            resetProductSaleForm()
        },
        onError: (error) => toast.error(error.message)
    })

    const updateProductSaleMutation = trpc.shift.updateProductSale.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.shift.getSummary.invalidate()
            toast.success("Product sale updated")
            setIsAddProductOpen(false)
            resetProductSaleForm()
        },
        onError: (error) => toast.error(error.message)
    })

    const deleteProductSaleMutation = trpc.shift.deleteProductSale.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.shift.getSummary.invalidate()
            toast.success("Product sale removed")
            setProductSaleToDelete(null)
            setDeletingProductSaleId(null)
        },
        onError: (error) => {
            toast.error(error.message)
            setDeletingProductSaleId(null)
        }
    })

    const resetProductSaleForm = () => {
        setSelectedProductId("")
        setSaleQuantity("1")
        setCustomPrice("")
        setEditingProductSale(null)
    }

    const handleOpenAddProduct = () => {
        resetProductSaleForm()
        setIsAddProductOpen(true)
    }

    const handleEditProductSale = (sale: SessionProduct) => {
        setEditingProductSale(sale)
        setSelectedProductId(sale.productId.toString())
        setSaleQuantity(parseFloat(sale.quantity.toString()).toString())
        setCustomPrice(parseFloat(sale.price.toString()).toString())
        setIsAddProductOpen(true)
    }

    const handleSaveProductSale = (e: React.FormEvent) => {
        e.preventDefault()
        const qty = parseFloat(saleQuantity)
        if (isNaN(qty) || qty <= 0) {
            toast.error("Please enter a valid quantity greater than 0")
            return
        }

        let price: number | undefined = undefined
        if (effectiveIsAdmin) {
            price = customPrice ? parseFloat(customPrice) : undefined
            if (price !== undefined && (isNaN(price) || price < 0)) {
                toast.error("Please enter a valid price (0 or higher)")
                return
            }
        } else {
            price = selectedProduct ? parseFloat(selectedProduct.rate.toString()) : (customPrice ? parseFloat(customPrice) : undefined)
        }

        if (editingProductSale) {
            updateProductSaleMutation.mutate({
                id: editingProductSale.id,
                quantity: qty,
                price: price,
            })
        } else {
            if (!selectedProductId) {
                toast.error("Please select a product")
                return
            }
            addProductSaleMutation.mutate({
                shiftId: session.id,
                productId: parseInt(selectedProductId),
                quantity: qty,
                price: price,
            })
        }
    }

    const handleConfirmDeleteProductSale = () => {
        if (!productSaleToDelete) return
        setDeletingProductSaleId(productSaleToDelete.id)
        deleteProductSaleMutation.mutate({ id: productSaleToDelete.id })
    }

    const totalProductSales = useMemo(() => {
        return (session.sessionProducts || []).reduce((sum: number, sp: SessionProduct) => {
            return sum + (parseFloat(sp.amount?.toString() || '0') || 0)
        }, 0)
    }, [session.sessionProducts])

    const totalFuelSales = summary?.totalFuelSales ?? 0
    const totalShiftSales = totalFuelSales + totalProductSales
    const totalCollected = session.sessionPayments?.reduce((sum: number, p: SessionPayment) => sum + parseFloat(p.amount.toString()), 0) || 0
    const liveShortage = totalCollected - totalShiftSales

    const handleConfirmRemoveNozzle = () => {
        if (!nozzleToRemove) return
        removeNozzleMutation.mutate({
            shiftId: session.id,
            nozzleId: nozzleToRemove.nozzleId
        })
    }


    // Check if selected method is Cash and denomination entry is enabled
    const selectedMethod = paymentMethods.find(pm => pm.id.toString() === selectedMethodId)
    const isStaffMethod = selectedMethod?.name === 'STAFF'
    const isCashPayment = selectedMethod?.name.toLowerCase() === 'cash'
    const isPineLabsMethod = selectedMethod?.name === 'PINE LABS'
    const existingCashPayment = session.sessionPayments.find(p => p.paymentMethod.name.toLowerCase() === 'cash')

    // Auto-edit existing cash payment when "Cash" is selected
    useEffect(() => {
        if (isCashPayment && existingCashPayment && editingPaymentId !== existingCashPayment.id) {
            handleEditPayment(existingCashPayment)
        }
    }, [isCashPayment, existingCashPayment, editingPaymentId])

    const showDenominations = isCashPayment && settings?.enableDenominationEntry && denominations.length > 0
    const showCoins = showDenominations && settings?.enableCoinEntry

    // Calculate total from denominations + coins
    const calculatedTotal = useMemo(() => {
        if (!showDenominations) return 0

        let total = 0
        for (const denom of denominations) {
            const count = denominationCounts[denom.id] || 0
            total += denom.value * count
        }
        total += parseFloat(coinsAmount) || 0
        return total
    }, [showDenominations, denominations, denominationCounts, coinsAmount])

    // Reset denomination counts when method changes
    useEffect(() => {
        if (!showDenominations) {
            setDenominationCounts({})
            setCoinsAmount("")
        }
    }, [showDenominations])

    const handleDenominationChange = (denomId: number, count: string) => {
        const numCount = parseInt(count) || 0
        setDenominationCounts(prev => ({
            ...prev,
            [denomId]: Math.max(0, numCount)
        }))
    }

    const handleAddPayment = async () => {
        if (!selectedMethodId) return

        if (isStaffMethod && !selectedStaffId) {
            toast.error("Please select a staff member")
            return
        }

        let amount: number
        let denomsToSend: DenominationCount[] | undefined
        let coinsToSend: number | undefined

        if (showDenominations) {
            amount = calculatedTotal
            if (amount <= 0) return

            denomsToSend = Object.entries(denominationCounts)
                .filter(([, count]) => count > 0)
                .map(([denomId, count]) => ({
                    denominationId: parseInt(denomId),
                    count
                }))
            coinsToSend = parseFloat(coinsAmount) || undefined
        } else if (isPineLabsMethod) {
            amount = tapeTotal
            if (amount <= 0) return
        } else {
            amount = parseFloat(manualAmount)
            if (!amount || amount <= 0) return
        }

        setIsPaymentSubmitting(true)
        try {
            await onAddPayment({
                methodId: parseInt(selectedMethodId),
                amount,
                paymentId: editingPaymentId || undefined,
                staffId: isStaffMethod ? parseInt(selectedStaffId) : null,
                denominations: denomsToSend,
                coinsAmount: coinsToSend
            })

            // Reset form only on success
            setSelectedMethodId("")
            setSelectedStaffId("")
            setManualAmount("")
            setDenominationCounts({})
            setCoinsAmount("")
            setEditingPaymentId(null)
            setTapeResetKey(k => k + 1)
        } finally {
            setIsPaymentSubmitting(false)
        }
    }

    const handleEditPayment = (payment: SessionPayment) => {
        setSelectedMethodId(payment.paymentMethodId.toString())
        setSelectedStaffId(payment.staffId ? payment.staffId.toString() : "")
        setManualAmount(payment.amount.toString())
        setEditingPaymentId(payment.id)

        // Restore denomination counts
        const counts: Record<number, number> = {}
        if (payment.denominations) {
            payment.denominations.forEach((d: { denominationId: number; count: number }) => {
                counts[d.denominationId] = d.count
            })
        }
        setDenominationCounts(counts)

        // Restore coins
        setCoinsAmount(payment.coinsAmount ? payment.coinsAmount.toString() : "")

        // Scroll to form
        paymentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

        // Auto-focus amount input if not cash
        if (payment.paymentMethod.name.toLowerCase() !== 'cash') {
            setTimeout(() => {
                manualAmountRef.current?.focus()
                manualAmountRef.current?.select() // Select text for easy overwriting
            }, 300)
        }
    }

    const handleCancelEdit = () => {
        setSelectedMethodId("")
        setSelectedStaffId("")
        setManualAmount("")
        setDenominationCounts({})
        setCoinsAmount("")
        setEditingPaymentId(null)
        setTapeResetKey(k => k + 1)
    }



    // Calculate method totals
    const methodSummaries = useMemo(() => {
        const summaries: Record<number, PaymentMethodSummary> = {}

        // Initialize with all available methods to show 0 for unused ones if needed, 
        // or just rely on payments. Let's start with empty.

        session.sessionPayments?.forEach(payment => {
            if (!summaries[payment.paymentMethodId]) {
                summaries[payment.paymentMethodId] = {
                    methodId: payment.paymentMethodId,
                    methodName: payment.paymentMethod.name,
                    totalAmount: 0,
                    count: 0,
                    payments: []
                }
            }

            summaries[payment.paymentMethodId].totalAmount += parseFloat(payment.amount.toString())
            summaries[payment.paymentMethodId].count += 1
            summaries[payment.paymentMethodId].payments.push(payment)
        })

        return summaries
    }, [session.sessionPayments])

    const productsSoldSection = (
        <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <HugeiconsIcon icon={PackageIcon} />
                    Products Sold
                </h3>
                <Button variant="outline" size="sm" onClick={handleOpenAddProduct}>
                    <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                    Product sales
                </Button>
            </div>

            {(session.sessionProducts || []).length > 0 ? (
                <div className="space-y-2">
                    {session.sessionProducts.map((sale: SessionProduct) => (
                        <div
                            key={sale.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors bg-card text-card-foreground shadow-sm animate-in fade-in-0 duration-200"
                        >
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{sale.product?.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    ({parseFloat(sale.quantity.toString())} {sale.product?.unit || 'Pcs'} × ₹{parseFloat(sale.price.toString()).toFixed(2)})
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold">
                                    ₹{parseFloat(sale.amount.toString()).toFixed(2)}
                                </span>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                        onClick={() => handleEditProductSale(sale)}
                                        title="Edit Sale"
                                    >
                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => setProductSaleToDelete(sale)}
                                        disabled={deletingProductSaleId === sale.id}
                                        title="Remove Sale"
                                    >
                                        {deletingProductSaleId === sale.id ? (
                                            <HugeiconsIcon icon={Loading03Icon} className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="p-6 text-center text-muted-foreground text-sm">
                        No products recorded yet.
                    </CardContent>
                </Card>
            )}
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>
                                {session.type ? (session.type.charAt(0) + session.type.slice(1).toLowerCase() + ' Shift') : 'Shift'}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <HugeiconsIcon icon={TimeQuarterPassIcon} className="h-4 w-4" />
                                {Math.floor(elapsedTime / 3600).toString().padStart(2, '0')}:{Math.floor((elapsedTime % 3600) / 60).toString().padStart(2, '0')} elapsed
                            </CardDescription>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Nozzles: {session.nozzleReadings.length}</p>
                            <p className="text-sm text-muted-foreground">Products: {session.sessionProducts?.length || 0}</p>
                            <p className="text-sm text-muted-foreground">Payments: {session.sessionPayments?.length || 0}</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {/* Left: Nozzles */}
                <div className="md:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <HugeiconsIcon icon={FuelStationIcon} />
                            Nozzle Readings
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => setIsAddNozzleOpen(true)}>
                            <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                            Add Nozzle
                        </Button>
                    </div>

                    {[...session.nozzleReadings]
                        .sort((a, b) => a.nozzle.code.localeCompare(b.nozzle.code))
                        .map((reading: NozzleReading) => (
                            <Card key={reading.id}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge>{reading.nozzle.code}</Badge>
                                            <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                            <Badge variant="outline" className="text-xs font-mono font-medium">
                                                ₹{parseFloat((reading.nozzle.price || reading.nozzle.fuel?.price || 0).toString()).toFixed(2)}/L
                                            </Badge>
                                        </div>
                                        {reading.closingReading !== null ? (
                                            <Badge variant="default" className="bg-green-500">
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="mr-1 h-3 w-3" />
                                                Complete
                                            </Badge>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveNozzleClick(reading)}
                                                title="Remove Nozzle"
                                            >
                                                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Opening</p>
                                            <p className="font-medium">
                                                {parseFloat(reading.openingReading.toString()).toFixed(2)} L
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground flex items-center gap-2">
                                                Test Qty
                                                {!editingTestQtyId && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-4 w-4 text-muted-foreground hover:text-primary"
                                                        onClick={() => setEditingTestQtyId(reading.id)}
                                                    >
                                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </p>
                                            {editingTestQtyId === reading.id ? (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-7 w-20 px-2 text-sm"
                                                        defaultValue={parseFloat(reading.testQty.toString())}
                                                        id={`test-qty-${reading.id}`}
                                                        autoFocus
                                                        onKeyDown={async (e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = parseFloat(e.currentTarget.value) || 0
                                                                setUpdatingTestQtyId(reading.id)
                                                                try {
                                                                    await onUpdateTestQty(reading.id, val)
                                                                    setEditingTestQtyId(null)
                                                                } finally {
                                                                    setUpdatingTestQtyId(null)
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={async () => {
                                                            const input = document.getElementById(`test-qty-${reading.id}`) as HTMLInputElement
                                                            const val = parseFloat(input.value) || 0
                                                            setUpdatingTestQtyId(reading.id)
                                                            try {
                                                                await onUpdateTestQty(reading.id, val)
                                                                setEditingTestQtyId(null)
                                                            } finally {
                                                                setUpdatingTestQtyId(null)
                                                            }
                                                        }}
                                                        disabled={updatingTestQtyId === reading.id}
                                                    >
                                                        {updatingTestQtyId === reading.id ? (
                                                            <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => setEditingTestQtyId(null)}
                                                    >
                                                        <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {Number(reading.testQty) > 0 ? (
                                                        <p className="font-medium">
                                                            {parseFloat(reading.testQty.toString()).toFixed(2)} L
                                                        </p>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 text-xs px-2 border-dashed text-muted-foreground"
                                                            onClick={() => setEditingTestQtyId(reading.id)}
                                                        >
                                                            + Add Test Qty
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {reading.closingReading !== null && (
                                            <div>
                                                <p className="text-muted-foreground">Qty Dispensed</p>
                                                <p className="font-medium">
                                                    {(
                                                        parseFloat(reading.closingReading.toString()) -
                                                        parseFloat(reading.openingReading.toString()) -
                                                        parseFloat(reading.testQty.toString())
                                                    ).toFixed(2)} L
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
                                                onKeyDown={async (e) => {
                                                    if (e.key === 'Enter') {
                                                        const value = parseFloat(e.currentTarget.value)
                                                        if (!isNaN(value)) {
                                                            setUpdatingClosingReadingId(reading.id)
                                                            try {
                                                                await onUpdateClosingReading(reading.id, value)
                                                            } finally {
                                                                setUpdatingClosingReadingId(null)
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                            <Button
                                                onClick={async () => {
                                                    const input = document.getElementById(`closing-${reading.id}`) as HTMLInputElement
                                                    const value = parseFloat(input.value)
                                                    if (!isNaN(value)) {
                                                        setUpdatingClosingReadingId(reading.id)
                                                        try {
                                                            await onUpdateClosingReading(reading.id, value)
                                                        } finally {
                                                            setUpdatingClosingReadingId(null)
                                                        }
                                                    }
                                                }}
                                                size="icon"
                                                disabled={updatingClosingReadingId === reading.id}
                                            >
                                                {updatingClosingReadingId === reading.id ? (
                                                    <HugeiconsIcon icon={Loading03Icon} className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                    {/* Products Sold Section (Desktop) */}
                    <div className="hidden md:block">
                        {productsSoldSection}
                    </div>
                </div>

                {/* Right: Payments */}
                <div className="md:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <HugeiconsIcon icon={MoneyReceive01Icon} />
                            Payments Collected
                        </h3>

                        <Card ref={paymentFormRef}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Add Payment</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    <Combobox
                                        items={paymentMethods}
                                        value={selectedMethod || null}
                                        onValueChange={(val: PaymentMethod | null) => {
                                            setSelectedMethodId(val?.id.toString() ?? "")
                                            if (val?.name !== "STAFF") {
                                                setSelectedStaffId("")
                                            }
                                        }}
                                        itemToStringLabel={(item: PaymentMethod) => item?.name ?? ""}
                                    >
                                        <ComboboxInput placeholder="Select Method" showClear />
                                        <ComboboxContent>
                                            <ComboboxEmpty>No items found.</ComboboxEmpty>
                                            <ComboboxList>
                                                {(item: PaymentMethod) => (
                                                    <ComboboxItem key={item.id} value={item} className="justify-between">
                                                        <span>{item.name}</span>
                                                        {methodSummaries[item.id] && (
                                                            <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5 font-normal">
                                                                ₹{methodSummaries[item.id].totalAmount.toLocaleString()} {methodSummaries[item.id].count > 1 && `(${methodSummaries[item.id].count})`}
                                                            </Badge>
                                                        )}
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>

                                {isStaffMethod && (
                                    <div className="space-y-2">
                                        <Label>Select Staff <span className="text-destructive">*</span></Label>
                                        <Select
                                            value={selectedStaffId}
                                            onValueChange={setSelectedStaffId}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select staff member" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {activeStaffList.map((st) => (
                                                    <SelectItem key={st.id} value={st.id.toString()}>
                                                        {st.name ? `${st.name} (${st.username})` : st.username}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Denomination Grid for Cash */}
                                {showDenominations && (
                                    <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
                                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Notes</Label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {denominations.map((denom) => (
                                                <div key={denom.id} className="grid grid-cols-[1fr_auto_1fr] items-center p-2 rounded-lg border bg-card shadow-sm gap-1">
                                                    <span className="font-bold text-base truncate">{denom.label}</span>
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <span className="text-muted-foreground text-xs">×</span>
                                                        <Input
                                                            type="number"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            min="0"
                                                            className="w-16 text-center"
                                                            value={denominationCounts[denom.id] || ""}
                                                            onChange={(e) => handleDenominationChange(denom.id, e.target.value)}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                    <span className="text-sm font-medium text-right text-muted-foreground truncate">
                                                        ₹{((denominationCounts[denom.id] || 0) * denom.value).toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {showCoins && (
                                            <>
                                                <Label className="text-xs text-muted-foreground uppercase tracking-wider pt-2">Coins</Label>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-14 text-sm font-medium">Total</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="flex-1"
                                                        value={coinsAmount}
                                                        onChange={(e) => setCoinsAmount(e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </>
                                        )}

                                        <div className="pt-2 border-t flex justify-between items-center">
                                            <span className="font-medium">Total</span>
                                            <span className="text-xl font-bold text-primary">
                                                ₹{calculatedTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Manual amount for non-cash or when denominations disabled */}
                                {!showDenominations && selectedMethodId && !isPineLabsMethod && (
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <Input
                                            ref={manualAmountRef}
                                            type="number"
                                            value={manualAmount}
                                            onChange={(e) => setManualAmount(e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                )}

                                {/* Pine Labs amount tape */}
                                {isPineLabsMethod && (
                                    <div className="space-y-2">
                                        <Label>Amount <span className="text-xs font-normal text-muted-foreground">(add each transaction)</span></Label>
                                        <AmountTape
                                            onChange={handleTapeChange}
                                            initialAmount={editingPaymentId ? (parseFloat(manualAmount) || undefined) : undefined}
                                            resetKey={tapeResetKey}
                                        />
                                    </div>
                                )}


                                <div className="flex gap-2">
                                    {editingPaymentId && (
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={handleCancelEdit}
                                            disabled={isPaymentSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    <Button
                                        className="flex-1"
                                        onClick={handleAddPayment}
                                        disabled={isPaymentSubmitting}
                                    >
                                        {isPaymentSubmitting ? (
                                            <>
                                                <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                                                {editingPaymentId ? "Updating..." : "Adding..."}
                                            </>
                                        ) : (
                                            <>{editingPaymentId ? "Update" : "Add"} Payment</>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">Payment History</p>

                            {/* Grouped Payment History */}
                            {(session.sessionPayments || [])
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .map((payment) => (
                                    <div key={payment.id} className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/40 transition-colors bg-card text-card-foreground shadow-sm animate-in fade-in-0 duration-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm">{payment.paymentMethod?.name}</span>
                                                {payment.paymentMethod?.name === "STAFF" && payment.staff && (
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {payment.staff.name || payment.staff.username}
                                                    </Badge>
                                                )}
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {payment.denominations && payment.denominations.length > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-5 text-[10px] px-1.5 text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setExpandedPaymentId(expandedPaymentId === payment.id ? null : payment.id)
                                                        }}
                                                    >
                                                        {expandedPaymentId === payment.id ? "Hide Details" : "View Details"}
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold">₹{parseFloat(payment.amount.toString()).toLocaleString()}</span>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleEditPayment(payment)
                                                        }}
                                                    >
                                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPaymentToDelete(payment)
                                                        }}
                                                        disabled={deletingPaymentId === payment.id}
                                                    >
                                                        {deletingPaymentId === payment.id ? (
                                                            <HugeiconsIcon icon={Loading03Icon} className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Denomination Details */}
                                        {expandedPaymentId === payment.id && payment.denominations && payment.denominations.length > 0 && (
                                            <div className="mt-1 pt-2 border-t text-sm bg-muted/30 p-2 rounded-md">
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                    {payment.denominations.map((d: any) => (
                                                        <div key={d.id} className="flex justify-between items-center text-xs">
                                                            <span>{d.denomination?.label || `Note ${d.denominationId}`} <span className="text-muted-foreground">x {d.count}</span></span>
                                                            <span className="font-medium">₹{(d.count * (d.denomination?.value || 0)).toLocaleString()}</span>
                                                        </div>
                                                    ))}
                                                    {Number(payment.coinsAmount) > 0 && (
                                                        <div className="flex justify-between items-center text-xs pt-1 border-t border-dashed mt-1 col-span-2">
                                                            <span>Coins</span>
                                                            <span className="font-medium">₹{Number(payment.coinsAmount).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            {(!session.sessionPayments || session.sessionPayments.length === 0) && (
                                <Card className="bg-muted/30 border-dashed">
                                    <CardContent className="p-6 text-center text-muted-foreground text-sm">
                                        No payments recorded yet.
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Products Sold Section (Small devices / Mobile) */}
                        <div className="block md:hidden">
                            {productsSoldSection}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Card className="bg-primary/5 border-primary/20 h-24 flex flex-col justify-center">
                            <CardContent className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1 font-semibold">Total Collected</p>
                                <p className="text-2xl font-bold text-primary">
                                    ₹{(session.sessionPayments?.reduce((sum: number, p: SessionPayment) => sum + parseFloat(p.amount.toString()), 0) || 0).toFixed(2)}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={`${liveShortage < 0 ? 'bg-destructive/10 border-destructive/20' : liveShortage > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/50 border-muted-foreground/20'} h-12 flex flex-col justify-center overflow-hidden`}>
                            <CardContent className="p-1 text-center">
                                <div className="flex flex-col items-center justify-center">
                                    <p className="text-[10px] text-muted-foreground font-semibold leading-none mb-1">
                                        {liveShortage < 0 ? 'Shortage' : liveShortage > 0 ? 'Excess' : 'Status'}
                                    </p>
                                    <p className={`text-base font-bold leading-none ${liveShortage < 0 ? 'text-destructive' : liveShortage > 0 ? 'text-green-600' : ''}`}>
                                        ₹{Math.abs(liveShortage).toFixed(2)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="pt-6 border-t flex gap-4">
                        <Button
                            className="flex-1"
                            variant="outline"
                            size="lg"
                            onClick={onReview}
                            disabled={isSubmitting}
                        >
                            Review & Finish
                        </Button>
                        <Button
                            className="flex-1"
                            size="lg"
                            onClick={onSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                                    Finishing...
                                </>
                            ) : (
                                "Finish & Submit"
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Add Nozzle Dialog */}
            <Dialog open={isAddNozzleOpen} onOpenChange={setIsAddNozzleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Nozzle to Shift</DialogTitle>
                        <DialogDescription>
                            Select a nozzle to add to your current shift.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Select Nozzle</Label>
                        <Select value={selectedNozzleToAdd} onValueChange={setSelectedNozzleToAdd}>
                            <SelectTrigger>
                                <SelectValue placeholder="Include Nozzle" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableNozzlesQuery.data?.map(nozzle => (
                                    <SelectItem key={nozzle.id} value={nozzle.id.toString()}>
                                        {nozzle.code} ({nozzle.fuel.name})
                                    </SelectItem>
                                ))}
                                {(!availableNozzlesQuery.data || availableNozzlesQuery.data.length === 0) && (
                                    <SelectItem value="none" disabled>No available nozzles</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddNozzleOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddNozzle} disabled={!selectedNozzleToAdd || addNozzleMutation.isPending}>
                            {addNozzleMutation.isPending ? "Adding..." : "Add Nozzle"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Nozzle Confirmation Dialog */}
            <Dialog open={isRemoveNozzleOpen} onOpenChange={setIsRemoveNozzleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Nozzle</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove nozzle {nozzleToRemove?.nozzle.code} from this shift?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-amber-50 rounded-md p-3 text-sm text-amber-800 border border-amber-200 my-2 flex gap-2">
                        <HugeiconsIcon icon={InformationCircleIcon} className="h-5 w-5 shrink-0" />
                        <p>This will remove the nozzle from your active shift and make it available for others. No sales data will be recorded for this nozzle.</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRemoveNozzleOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmRemoveNozzle}
                            disabled={removeNozzleMutation.isPending}
                        >
                            {removeNozzleMutation.isPending ? "Removing..." : "Remove Nozzle"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this payment record.
                            {paymentToDelete && (
                                <span className="mt-2 p-2 bg-muted rounded text-sm font-medium block">
                                    {paymentToDelete.paymentMethod.name} — ₹{parseFloat(paymentToDelete.amount.toString()).toLocaleString()}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                                if (!paymentToDelete) return
                                setDeletingPaymentId(paymentToDelete.id)
                                setPaymentToDelete(null) // Close dialog immediately
                                try {
                                    await onDeletePayment(paymentToDelete.id)
                                } finally {
                                    setDeletingPaymentId(null)
                                }
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add / Edit Product Sale Dialog */}
            <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProductSale ? "Edit Product Sale" : "Record Product Sale"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProductSale
                                ? (effectiveIsAdmin
                                    ? "Update the quantity or rate for this recorded product sale."
                                    : "Update the quantity for this recorded product sale.")
                                : "Select a product and enter the quantity sold during this shift."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveProductSale} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="product-select">Product</Label>
                            <Select
                                value={selectedProductId}
                                onValueChange={(val) => {
                                    setSelectedProductId(val)
                                    const prod = availableProducts.find((p: Product) => p.id.toString() === val)
                                    if (prod) {
                                        if (!effectiveIsAdmin || !customPrice || editingProductSale === null) {
                                            setCustomPrice(parseFloat(prod.rate.toString()).toString())
                                        }
                                    }
                                }}
                                disabled={!!editingProductSale}
                            >
                                <SelectTrigger id="product-select">
                                    <SelectValue placeholder="Select a product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableProducts.map((product: Product) => (
                                        <SelectItem key={product.id} value={product.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <span>{product.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    (₹{parseFloat(product.rate.toString()).toFixed(2)}/{product.unit})
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                    {availableProducts.length === 0 && (
                                        <SelectItem value="none" disabled>No active products available</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="product-quantity">
                                    Quantity {selectedProduct ? `(${selectedProduct.unit})` : ''}
                                </Label>
                                <Input
                                    id="product-quantity"
                                    type="number"
                                    step="any"
                                    min="0.01"
                                    placeholder="1"
                                    value={saleQuantity}
                                    onChange={(e) => setSaleQuantity(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="product-price">
                                    Rate (₹)
                                </Label>
                                <Input
                                    id="product-price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={selectedProduct ? parseFloat(selectedProduct.rate.toString()).toFixed(2) : "0.00"}
                                    value={customPrice}
                                    onChange={(e) => setCustomPrice(e.target.value)}
                                    disabled={!effectiveIsAdmin}
                                    className={!effectiveIsAdmin ? "bg-muted cursor-not-allowed text-muted-foreground" : ""}
                                />
                            </div>
                        </div>

                        {/* Total Preview */}
                        <div className="pt-2 border-t flex justify-between items-center">
                            <span className="text-sm font-medium text-muted-foreground">Total Sale Amount:</span>
                            <span className="text-lg font-bold text-primary">
                                ₹{(((parseFloat(saleQuantity) || 0) * (customPrice ? (parseFloat(customPrice) || 0) : (selectedProduct ? parseFloat(selectedProduct.rate.toString()) : 0)))).toFixed(2)}
                            </span>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddProductOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    !selectedProductId ||
                                    addProductSaleMutation.isPending ||
                                    updateProductSaleMutation.isPending
                                }
                            >
                                {addProductSaleMutation.isPending || updateProductSaleMutation.isPending ? (
                                    <>
                                        <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingProductSale ? "Update Sale" : "Save Sale"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Product Sale Confirmation Dialog */}
            <AlertDialog open={!!productSaleToDelete} onOpenChange={(open) => !open && setProductSaleToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Product Sale?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this product sale from the shift?
                            {productSaleToDelete && (
                                <span className="mt-2 p-2 bg-muted rounded text-sm font-medium block">
                                    {productSaleToDelete.product?.name} ({parseFloat(productSaleToDelete.quantity.toString())} {productSaleToDelete.product?.unit}) — ₹{parseFloat(productSaleToDelete.amount.toString()).toFixed(2)}
                                </span>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleConfirmDeleteProductSale}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
