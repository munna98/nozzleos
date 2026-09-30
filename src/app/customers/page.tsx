"use client"

import { useState, useRef, useEffect } from "react"
import { Customer } from "@/lib/api"
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
import { Input } from "@/components/ui/input"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon, Delete02Icon, PencilEdit01Icon, Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"
import { AddCustomerDialog } from "@/components/add-customer-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [customerToDeleteId, setCustomerToDeleteId] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const customersQuery = trpc.customer.getAll.useQuery()
    const utils = trpc.useUtils()
    const deleteMutation = trpc.customer.delete.useMutation({
        onSuccess: () => {
            utils.customer.getAll.invalidate()
            toast.success("Customer deleted successfully")
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete customer")
        }
    })

    const customers = customersQuery.data || []
    const loading = customersQuery.isLoading

    const filteredCustomers = customers.filter((customer: Customer) => {
        const query = searchQuery.toLowerCase()
        return (
            (customer.name?.toLowerCase() || "").includes(query) ||
            (customer.email?.toLowerCase() || "").includes(query) ||
            (customer.phone?.toLowerCase() || "").includes(query)
        )
    })

    const handleAddClick = () => {
        setSelectedCustomer(undefined)
        setIsDialogOpen(true)
    }

    const handleEditClick = (customer: Customer) => {
        setSelectedCustomer(customer)
        setIsDialogOpen(true)
    }

    const handleDeleteClick = (id: number) => {
        setCustomerToDeleteId(id)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = () => {
        if (customerToDeleteId) {
            deleteMutation.mutate({ id: customerToDeleteId }, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false)
                    setCustomerToDeleteId(null)
                }
            })
        }
    }

    const handleSuccess = () => {
        setIsDialogOpen(false)
        customersQuery.refetch()
    }

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div className="flex justify-between items-center gap-4">
                {/* Mobile: Expandable Search */}
                <div className={`md:hidden ${isSearchOpen ? 'flex-1' : ''}`}>
                    {isSearchOpen ? (
                        <div className="relative flex items-center gap-2 w-full">
                            <HugeiconsIcon
                                icon={Search01Icon}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                            />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search customers..."
                                className="pl-9 w-full"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => {
                                    if (!searchQuery) {
                                        setIsSearchOpen(false)
                                    }
                                }}
                                autoFocus
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setSearchQuery("")
                                    setIsSearchOpen(false)
                                }}
                            >
                                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
                    )}
                </div>

                {/* Desktop: Title */}
                <h2 className="hidden md:block text-3xl font-bold tracking-tight">Customers</h2>

                {/* Mobile: Search + Add Buttons (shown when search is closed) */}
                {!isSearchOpen && (
                    <div className="flex md:hidden items-center gap-2">
                        <Button variant="secondary" size="icon" onClick={() => setIsSearchOpen(true)}>
                            <HugeiconsIcon icon={Search01Icon} className="h-5 w-5" />
                        </Button>
                        <Button onClick={handleAddClick} size="icon">
                            <HugeiconsIcon icon={PlusSignIcon} className="h-5 w-5" />
                        </Button>
                    </div>
                )}

                {/* Desktop: Search + Add Button */}
                <div className="hidden md:flex items-center gap-2">
                    <div className="relative w-64">
                        <HugeiconsIcon
                            icon={Search01Icon}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                        />
                        <Input
                            placeholder="Search customers..."
                            className="pl-9 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAddClick}>
                        <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" /> Add Customer
                    </Button>
                </div>
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
                                    <TableCell colSpan={5} className="text-center py-10"><Spinner className="size-6 mx-auto" /></TableCell>
                                </TableRow>
                            ) : filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10">No customers found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((customer: Customer) => (
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
                    <div className="text-center py-10"><Spinner className="size-6 mx-auto" /></div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-10">No customers found.</div>
                ) : (
                    filteredCustomers.map((customer: Customer) => (
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

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the customer record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCustomerToDeleteId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} variant="destructive">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
