"use client"

import { useState } from "react"
import { Customer } from "@/lib/api"
import { trpc } from "@/lib/trpc"
import { Button } from "@/components/ui/button"
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
import { AddCustomerDialog } from "@/components/add-customer-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const getInitials = (name: string) => {
    return name
        .split(' ')
        .filter(n => n)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

export default function CustomersPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>(undefined)

    const customersQuery = trpc.customer.getAll.useQuery()
    const utils = trpc.useUtils()
    const deleteMutation = trpc.customer.delete.useMutation({
        onSuccess: () => {
            utils.customer.getAll.invalidate()
        }
    })

    const customers = customersQuery.data || []
    const loading = customersQuery.isLoading

    const handleAddClick = () => {
        setSelectedCustomer(undefined)
        setIsDialogOpen(true)
    }

    const handleEditClick = (customer: Customer) => {
        setSelectedCustomer(customer)
        setIsDialogOpen(true)
    }

    const handleDeleteClick = async (id: number) => {
        if (confirm("Are you sure you want to delete this customer?")) {
            deleteMutation.mutate({ id })
        }
    }

    const handleSuccess = () => {
        setIsDialogOpen(false)
        customersQuery.refetch()
    }

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
                </div>
                <Button onClick={handleAddClick}>
                    <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" /> Add Customer
                </Button>
            </div>

            <Card className="hidden md:block">
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">Loading...</TableCell>
                                </TableRow>
                            ) : customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">No customers found.</TableCell>
                                </TableRow>
                            ) : (
                                customers.map((customer: Customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar size="sm">
                                                    <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                                                </Avatar>
                                                {customer.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{customer.email}</TableCell>
                                        <TableCell>{customer.phone || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={customer.isActive ? "default" : "secondary"}>
                                                {customer.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(customer)}>
                                                <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(customer.id)}>
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
                    <div className="text-center py-10">Loading...</div>
                ) : customers.length === 0 ? (
                    <div className="text-center py-10">No customers found.</div>
                ) : (
                    customers.map((customer: Customer) => (
                        <Card key={customer.id}>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarFallback>{getInitials(customer.name)}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-semibold">{customer.name}</div>
                                    </div>
                                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                                        {customer.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">Email:</div>
                                    <div className="truncate">{customer.email}</div>

                                    <div className="text-muted-foreground">Phone:</div>
                                    <div>{customer.phone || '-'}</div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEditClick(customer)}>
                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(customer.id)}>
                                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <AddCustomerDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={handleSuccess}
                customerToEdit={selectedCustomer}
            />
        </div>
    )
}
