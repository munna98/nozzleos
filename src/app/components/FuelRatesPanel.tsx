"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trpc } from "@/lib/trpc"
import { HugeiconsIcon } from "@hugeicons/react"
import { PencilEdit01Icon, Loading02Icon, Tick02Icon, FuelStationIcon } from "@hugeicons/core-free-icons"

export function FuelRatesPanel() {
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editPrice, setEditPrice] = useState("")

    const { data: fuels, isLoading, refetch } = trpc.fuel.getAll.useQuery()
    const updateMutation = trpc.fuel.update.useMutation({
        onSuccess: () => {
            setEditingId(null)
            setEditPrice("")
            refetch()
        }
    })

    const handleEdit = (id: number, currentPrice: number) => {
        setEditingId(id)
        setEditPrice(currentPrice.toString())
    }

    const handleSave = (id: number) => {
        const price = parseFloat(editPrice)
        if (!isNaN(price) && price >= 0) {
            updateMutation.mutate({ id, price })
        }
    }

    const handleCancel = () => {
        setEditingId(null)
        setEditPrice("")
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">⛽ Current Fuel Rates</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <HugeiconsIcon icon={Loading02Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    const activeFuels = fuels?.filter(f => f.isActive) || []

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <HugeiconsIcon icon={FuelStationIcon} className="h-5 w-5 text-muted-foreground" />
                    Current Fuel Rates
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {activeFuels.map((fuel) => (
                        <div key={fuel.id} className="relative group">
                            <div className="flex flex-col items-center justify-center min-h-[80px] w-full py-3 rounded-lg border border-dashed bg-card hover:bg-accent/50 hover:border-primary/50 transition-all">
                                <span className="text-xs font-medium text-muted-foreground mb-1">
                                    {fuel.name}
                                </span>

                                {editingId === fuel.id ? (
                                    <div className="flex items-center gap-1 px-2 w-full animate-in fade-in zoom-in-95 duration-200">
                                        <Input
                                            type="number"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(e.target.value)}
                                            className="h-7 text-center font-bold px-1"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSave(fuel.id)
                                                if (e.key === 'Escape') handleCancel()
                                            }}
                                        />
                                        <div className="flex gap-0.5">
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleSave(fuel.id)}>
                                                <HugeiconsIcon icon={Tick02Icon} className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleCancel}>
                                                <HugeiconsIcon icon={Loading02Icon} className="h-4 w-4 rotate-45" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-lg font-bold">
                                        ₹{fuel.price.toFixed(2)}
                                    </span>
                                )}
                            </div>

                            {editingId !== fuel.id && (
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                                    onClick={() => handleEdit(fuel.id, fuel.price)}
                                >
                                    <HugeiconsIcon icon={PencilEdit01Icon} className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {activeFuels.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground col-span-full">
                            No active fuels configured
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
