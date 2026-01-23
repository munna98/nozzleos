"use client"

import { useState } from "react"
import { Fuel } from "@/lib/api"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Delete02Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons"
import { AddFuelDialog } from "@/components/add-fuel-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export default function FuelsPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedFuel, setSelectedFuel] = useState<Fuel | undefined>(undefined)

    const fuelsQuery = trpc.fuel.getAll.useQuery()
    const utils = trpc.useUtils()
    const deleteMutation = trpc.fuel.delete.useMutation({
        onSuccess: () => {
            utils.fuel.getAll.invalidate()
        }
    })

    const fuels = fuelsQuery.data || []
    const loading = fuelsQuery.isLoading

    const handleAddClick = () => {
        setSelectedFuel(undefined)
        setIsDialogOpen(true)
    }

    const handleEditClick = (fuel: Fuel) => {
        setSelectedFuel(fuel)
        setIsDialogOpen(true)
    }

    const handleDeleteClick = async (id: number) => {
        if (confirm("Are you sure you want to delete this fuel?")) {
            deleteMutation.mutate({ id })
        }
    }

    const handleSuccess = () => {
        setIsDialogOpen(false)
        fuelsQuery.refetch()
    }

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Fuels</h2>
                </div>
                <Button onClick={handleAddClick}>
                    <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" /> Add Fuel
                </Button>
            </div>

            <Card className="hidden md:block">
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10"><Spinner className="size-6 mx-auto" /></TableCell>
                                </TableRow>
                            ) : fuels.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-10">No fuels found.</TableCell>
                                </TableRow>
                            ) : (
                                fuels.map((fuel: Fuel) => (
                                    <TableRow key={fuel.id}>
                                        <TableCell className="font-medium">{fuel.name}</TableCell>
                                        <TableCell>₹{fuel.price.toFixed(2)}</TableCell>
                                        <TableCell>
                                            <Badge variant={fuel.isActive ? "default" : "secondary"}>
                                                {fuel.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(fuel)}>
                                                <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(fuel.id)}>
                                                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Mobile View - Card List */}
            <div className="space-y-4 md:hidden">
                {loading ? (
                    <div className="text-center py-10"><Spinner className="size-6 mx-auto" /></div>
                ) : fuels.length === 0 ? (
                    <div className="text-center py-10">No fuels found.</div>
                ) : (
                    fuels.map((fuel: Fuel) => (
                        <Card key={fuel.id}>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="font-semibold">{fuel.name}</div>
                                    <Badge variant={fuel.isActive ? "default" : "secondary"}>
                                        {fuel.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">Price:</div>
                                    <div>₹{fuel.price.toFixed(2)}</div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEditClick(fuel)}>
                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(fuel.id)}>
                                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <AddFuelDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={handleSuccess}
                fuelToEdit={selectedFuel}
            />
        </div>
    )
}
