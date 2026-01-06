"use client"

import { useEffect, useState } from "react"
import { UserService, User, UserRole } from "@/lib/api"
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
import { PlusSignIcon, SettingsIcon, Delete02Icon } from "@hugeicons/core-free-icons"
import { AddEmployeeDialog } from "@/components/add-employee-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast" // Assuming useToast exists or I might need to add it

export default function EmployeesPage() {
    const [users, setUsers] = useState<User[]>([])
    const [roles, setRoles] = useState<UserRole[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [usersData, rolesData] = await Promise.all([
                UserService.getAll(),
                UserService.getRoles()
            ])
            setUsers(usersData)
            setRoles(rolesData)
        } catch (error) {
            console.error("Failed to fetch data:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleAddClick = () => {
        setSelectedUser(undefined)
        setIsDialogOpen(true)
    }

    const handleEditClick = (user: User) => {
        setSelectedUser(user)
        setIsDialogOpen(true)
    }

    const handleDeleteClick = async (id: number) => {
        if (confirm("Are you sure you want to delete this employee?")) {
            try {
                await UserService.delete(id)
                fetchData()
            } catch (error) {
                console.error("Failed to delete user", error)
            }
        }
    }

    const handleSuccess = () => {
        setIsDialogOpen(false)
        fetchData()
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Employees</h2>
                </div>
                <Button onClick={handleAddClick}>
                    <HugeiconsIcon icon={PlusSignIcon} className="mr-2 h-4 w-4" /> Add Employee
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Employee List</CardTitle>
                </CardHeader>
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
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">Loading...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">No employees found.</TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.name || user.username}
                                            {user.name && <span className="block text-xs text-muted-foreground">@{user.username}</span>}
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
                                                <HugeiconsIcon icon={SettingsIcon} className="h-4 w-4" />
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

            <AddEmployeeDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSuccess={handleSuccess}
                roles={roles}
                userToEdit={selectedUser}
            />
        </div>
    )
}
