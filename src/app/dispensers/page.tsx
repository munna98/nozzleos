"use client"

import React, { useState } from "react"
import { Dispenser, Nozzle } from "@/lib/api"
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
import { PlusSignIcon, Delete02Icon, PencilEdit01Icon, ChevronDown, ChevronUp } from "@hugeicons/core-free-icons"
import { AddDispenserDialog } from "@/components/add-dispenser-dialog"
import { AddNozzleDialog } from "@/components/add-nozzle-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
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

export default function DispensersPage() {
    const [isDispenserDialogOpen, setIsDispenserDialogOpen] = useState(false)
    const [isNozzleDialogOpen, setIsNozzleDialogOpen] = useState(false)
    const [selectedDispenser, setSelectedDispenser] = useState<Dispenser | undefined>(undefined)
    const [selectedNozzle, setSelectedNozzle] = useState<Nozzle | undefined>(undefined)
    const [selectedDispenserId, setSelectedDispenserId] = useState<number | undefined>(undefined)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [isDispenserDeleteDialogOpen, setIsDispenserDeleteDialogOpen] = useState(false)
    const [dispenserIdToDelete, setDispenserIdToDelete] = useState<number | null>(null)
    const [isNozzleDeleteDialogOpen, setIsNozzleDeleteDialogOpen] = useState(false)
    const [nozzleIdToDelete, setNozzleIdToDelete] = useState<number | null>(null)

    const dispensersQuery = trpc.dispenser.getAll.useQuery()
    const utils = trpc.useUtils()

    // Mutations
    const deleteDispenserMutation = trpc.dispenser.delete.useMutation({
        onSuccess: () => {
            utils.dispenser.getAll.invalidate()
            toast.success("Dispenser deleted successfully")
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete dispenser")
        }
    })

    const deleteNozzleMutation = trpc.nozzle.delete.useMutation({
        onSuccess: () => {
            // Invalidate dispenser list as it likely contains the nozzles relation
            utils.dispenser.getAll.invalidate()
            // Also invalidate nozzle list if used elsewhere
            utils.nozzle.getAll.invalidate()
            toast.success("Nozzle deleted successfully")
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete nozzle")
        }
    })

    const dispensers = dispensersQuery.data || []
    const loading = dispensersQuery.isLoading

    const handleAddDispenserClick = () => {
        setSelectedDispenser(undefined)
        setIsDispenserDialogOpen(true)
    }

    const handleEditDispenserClick = (dispenser: Dispenser) => {
        setSelectedDispenser(dispenser)
        setIsDispenserDialogOpen(true)
    }

    const handleDeleteDispenserClick = (id: number) => {
        setDispenserIdToDelete(id)
        setIsDispenserDeleteDialogOpen(true)
    }

    const confirmDeleteDispenser = () => {
        if (dispenserIdToDelete) {
            deleteDispenserMutation.mutate({ id: dispenserIdToDelete }, {
                onSuccess: () => {
                    setIsDispenserDeleteDialogOpen(false)
                    setDispenserIdToDelete(null)
                }
            })
        }
    }

    const handleAddNozzleClick = (dispenserId: number) => {
        setSelectedNozzle(undefined)
        setSelectedDispenserId(dispenserId)
        setIsNozzleDialogOpen(true)
    }

    const handleEditNozzleClick = (nozzle: Nozzle) => {
        setSelectedNozzle(nozzle)
        setSelectedDispenserId(nozzle.dispenserId)
        setIsNozzleDialogOpen(true)
    }

    const handleDeleteNozzleClick = (id: number) => {
        setNozzleIdToDelete(id)
        setIsNozzleDeleteDialogOpen(true)
    }

    const confirmDeleteNozzle = () => {
        if (nozzleIdToDelete) {
            deleteNozzleMutation.mutate({ id: nozzleIdToDelete }, {
                onSuccess: () => {
                    setIsNozzleDeleteDialogOpen(false)
                    setNozzleIdToDelete(null)
                }
            })
        }
    }

    const handleSuccess = () => {
        setIsDispenserDialogOpen(false)
        setIsNozzleDialogOpen(false)
        dispensersQuery.refetch()
    }

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedRows(newExpanded)
    }

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dispensers</h2>
                </div>
                <Button onClick={handleAddDispenserClick}>
                    <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" /> Add Dispenser
                </Button>
            </div>

            <Card className="hidden md:block">
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Nozzles</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10"><Spinner className="size-6 mx-auto" /></TableCell>
                                </TableRow>
                            ) : dispensers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">No dispensers found.</TableCell>
                                </TableRow>
                            ) : (
                                dispensers.map((dispenser: Dispenser) => (
                                    <React.Fragment key={dispenser.id}>
                                        <TableRow>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleRow(dispenser.id)}
                                                >
                                                    <HugeiconsIcon
                                                        icon={expandedRows.has(dispenser.id) ? ChevronUp : ChevronDown}
                                                        className="h-4 w-4"
                                                    />
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{dispenser.code}</TableCell>
                                            <TableCell>{dispenser.name}</TableCell>
                                            <TableCell>{dispenser.nozzles?.length || 0}</TableCell>
                                            <TableCell>
                                                <Badge variant={dispenser.isActive ? "default" : "secondary"}>
                                                    {dispenser.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditDispenserClick(dispenser)}>
                                                    <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteDispenserClick(dispenser.id)}>
                                                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {expandedRows.has(dispenser.id) && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="bg-muted/50 p-4">
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="font-semibold">Nozzles</h4>
                                                            <Button size="sm" onClick={() => handleAddNozzleClick(dispenser.id)}>
                                                                <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                                                                Add Nozzle
                                                            </Button>
                                                        </div>
                                                        {dispenser.nozzles && dispenser.nozzles.length > 0 ? (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Code</TableHead>
                                                                        <TableHead>Fuel</TableHead>
                                                                        <TableHead>Price</TableHead>
                                                                        <TableHead>Current Reading</TableHead>
                                                                        <TableHead>Status</TableHead>
                                                                        <TableHead>Availability</TableHead>
                                                                        <TableHead className="text-right">Actions</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {dispenser.nozzles.map((nozzle: Nozzle) => (
                                                                        <TableRow key={nozzle.id}>
                                                                            <TableCell className="font-medium">{nozzle.code}</TableCell>
                                                                            <TableCell>{nozzle.fuel?.name}</TableCell>
                                                                            <TableCell>₹{nozzle.price.toFixed(2)}</TableCell>
                                                                            <TableCell>{(nozzle.currentreading || 0).toFixed(2)}</TableCell>
                                                                            <TableCell>
                                                                                <Badge variant={nozzle.isActive ? "default" : "secondary"} className="text-xs">
                                                                                    {nozzle.isActive ? "Active" : "Inactive"}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <Badge variant={nozzle.isAvailable ? "success" : "destructive"}>
                                                                                    {nozzle.isAvailable ? "Available" : "In Use"}
                                                                                </Badge>
                                                                            </TableCell>
                                                                            <TableCell className="text-right space-x-2">
                                                                                <Button variant="ghost" size="icon" onClick={() => handleEditNozzleClick(nozzle)}>
                                                                                    <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                                                                </Button>
                                                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteNozzleClick(nozzle.id)}>
                                                                                    <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                                                </Button>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <div className="text-center text-muted-foreground py-4">
                                                                No nozzles configured for this dispenser.
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
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
                ) : dispensers.length === 0 ? (
                    <div className="text-center py-10">No dispensers found.</div>
                ) : (
                    dispensers.map((dispenser: Dispenser) => (
                        <Card key={dispenser.id}>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-semibold">{dispenser.code}</div>
                                        <div className="text-sm text-muted-foreground">{dispenser.name}</div>
                                    </div>
                                    <Badge variant={dispenser.isActive ? "default" : "secondary"}>
                                        {dispenser.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">Nozzles:</div>
                                    <div>{dispenser.nozzles?.length || 0}</div>
                                </div>

                                <div className="flex justify-between gap-2 pt-2 border-t mt-2">
                                    <Button variant="outline" size="sm" onClick={() => toggleRow(dispenser.id)}>
                                        <HugeiconsIcon icon={expandedRows.has(dispenser.id) ? ChevronUp : ChevronDown} className="h-4 w-4" />
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEditDispenserClick(dispenser)}>
                                            <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-2" /> Edit
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteDispenserClick(dispenser.id)}>
                                            <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" /> Delete
                                        </Button>
                                    </div>
                                </div>

                                {expandedRows.has(dispenser.id) && (
                                    <div className="space-y-2 pt-2 border-t">
                                        <Button size="sm" className="w-full" onClick={() => handleAddNozzleClick(dispenser.id)}>
                                            <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" />
                                            Add Nozzle
                                        </Button>
                                        {dispenser.nozzles && dispenser.nozzles.length > 0 ? (
                                            dispenser.nozzles.map((nozzle: Nozzle) => (
                                                <Card key={nozzle.id} className="bg-muted/50">
                                                    <CardContent className="p-3 space-y-2">
                                                        <div className="flex justify-between">
                                                            <span className="font-medium">{nozzle.code}</span>
                                                            <Badge variant={nozzle.isActive ? "default" : "secondary"} className="text-xs">
                                                                {nozzle.isActive ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <div className="text-muted-foreground">Fuel:</div>
                                                            <div>{nozzle.fuel?.name}</div>
                                                            <div className="text-muted-foreground">Price:</div>
                                                            <div>₹{nozzle.price.toFixed(2)}</div>
                                                            <div className="text-muted-foreground">Current Reading:</div>
                                                            <div>{(nozzle.currentreading || 0).toFixed(2)}</div>
                                                        </div>
                                                        <div className="flex gap-2 pt-2">
                                                            <Badge
                                                                variant={nozzle.isAvailable ? "success" : "destructive"}
                                                                className="flex-1 justify-center rounded-md py-1.5"
                                                            >
                                                                {nozzle.isAvailable ? "Available" : "In Use"}
                                                            </Badge>
                                                            <Button variant="outline" size="sm" onClick={() => handleEditNozzleClick(nozzle)}>
                                                                <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteNozzleClick(nozzle.id)}>
                                                                <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))
                                        ) : (
                                            <div className="text-center text-muted-foreground py-2 text-sm">
                                                No nozzles configured.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <AddDispenserDialog
                open={isDispenserDialogOpen}
                onOpenChange={setIsDispenserDialogOpen}
                onSuccess={handleSuccess}
                dispenserToEdit={selectedDispenser}
            />

            <AddNozzleDialog
                open={isNozzleDialogOpen}
                onOpenChange={setIsNozzleDialogOpen}
                onSuccess={handleSuccess}
                nozzleToEdit={selectedNozzle}
                dispenserId={selectedDispenserId}
            />

            <AlertDialog open={isDispenserDeleteDialogOpen} onOpenChange={setIsDispenserDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the dispenser record.
                            You can only delete dispensers that have no nozzles.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDispenserIdToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteDispenser} variant="destructive">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isNozzleDeleteDialogOpen} onOpenChange={setIsNozzleDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the nozzle record.
                            You can only delete nozzles that have no historical session data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setNozzleIdToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteNozzle} variant="destructive">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
