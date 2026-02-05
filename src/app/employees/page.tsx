"use client"

import { useState, useRef, useEffect } from "react"
import { trpc } from "@/lib/trpc"
import { User, UserRole } from "@/lib/api"
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
import { AddEmployeeDialog } from "@/components/add-employee-dialog"
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

export default function EmployeesPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [userIdToDelete, setUserIdToDelete] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const usersQuery = trpc.user.getAll.useQuery()
    const rolesQuery = trpc.user.getRoles.useQuery()

    const utils = trpc.useUtils()
    const deleteMutation = trpc.user.delete.useMutation({
        onSuccess: () => {
            utils.user.getAll.invalidate()
            toast.success("Employee deleted successfully")
        },
        onError: (error) => {
            toast.error(error.message || "Failed to delete employee")
        }
    })

    const users = usersQuery.data || []
    const roles = rolesQuery.data || []
    // Cast strict boolean to be safe if types differ, or rely on truthiness
    const isLoading = usersQuery.isLoading

    const filteredUsers = users.filter((user: User) => {
        const query = searchQuery.toLowerCase()
        return (
            (user.name?.toLowerCase() || "").includes(query) ||
            (user.username?.toLowerCase() || "").includes(query) ||
            (user.role?.name?.toLowerCase() || "").includes(query) ||
            (user.code?.toLowerCase() || "").includes(query) ||
            (user.mobile?.toLowerCase() || "").includes(query)
        )
    })

    const handleAddClick = () => {
        setSelectedUser(undefined)
        setIsDialogOpen(true)
    }

    const handleEditClick = (user: User) => {
        setSelectedUser(user)
        setIsDialogOpen(true)
    }

    const handleDeleteClick = (id: number) => {
        setUserIdToDelete(id)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = () => {
        if (userIdToDelete) {
            deleteMutation.mutate({ id: userIdToDelete }, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false)
                    setUserIdToDelete(null)
                }
            })
        }
    }

    const handleSuccess = () => {
        setIsDialogOpen(false)
        usersQuery.refetch()
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
                                placeholder="Search employees..."
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
                        <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
                    )}
                </div>

                {/* Desktop: Title */}
                <h2 className="hidden md:block text-3xl font-bold tracking-tight">Employees</h2>

                {/* Mobile: Search + Add Buttons (shown when search is closed) */}
                {!isSearchOpen && (
                    <div className="flex md:hidden items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)}>
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
                            placeholder="Search employees..."
                            className="pl-9 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAddClick}>
                        <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" /> Add Employee
                    </Button>
                </div>
            </div>

            <Card className="hidden md:block">
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10"><Spinner className="size-6 mx-auto" /></TableCell>
                                </TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">No employees found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user: User) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <Avatar size="sm">
                                                    <AvatarFallback>{getInitials(user.name || user.username)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    {user.name || user.username}
                                                    {user.name && <span className="block text-xs text-muted-foreground">@{user.username}</span>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.role?.name || user.roleId}</TableCell>
                                        <TableCell>{user.code || '-'}</TableCell>
                                        <TableCell>{user.mobile || '-'}</TableCell>
                                        <TableCell>
                                            <Badge variant={user.isActive ? "default" : "secondary"}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                                <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteClick(user.id)}>
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
                {isLoading ? (
                    <div className="text-center py-10"><Spinner className="size-6 mx-auto" /></div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-10">No employees found.</div>
                ) : (
                    filteredUsers.map((user: User) => (
                        <Card key={user.id}>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarFallback>{getInitials(user.name || user.username)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-semibold">{user.name || user.username}</div>
                                            {user.name && <div className="text-xs text-muted-foreground">@{user.username}</div>}
                                        </div>
                                    </div>
                                    <Badge variant={user.isActive ? "default" : "secondary"}>
                                        {user.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="text-muted-foreground">Role:</div>
                                    <div>{user.role?.name || user.roleId}</div>

                                    <div className="text-muted-foreground">Code:</div>
                                    <div>{user.code || '-'}</div>

                                    <div className="text-muted-foreground">Mobile:</div>
                                    <div>{user.mobile || '-'}</div>
                                </div>

                                <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>
                                        <HugeiconsIcon icon={PencilEdit01Icon} className="h-4 w-4 mr-2" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(user.id)}>
                                        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" /> Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <AddEmployeeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={handleSuccess}
                roles={roles}
                userToEdit={selectedUser}
            />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the employee record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setUserIdToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} variant="destructive">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
