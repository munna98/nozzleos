"use client"

import { useState, useEffect } from "react"
import { UserService, User, UserRole, CreateUserDto, UpdateUserDto } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface AddEmployeeDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    roles: UserRole[]
    userToEdit?: User
}

export function AddEmployeeDialog({
    open,
    onOpenChange,
    onSuccess,
    roles,
    userToEdit
}: AddEmployeeDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<CreateUserDto & { isActive: boolean }>({
        username: "",
        name: "",
        password: "",
        code: "",
        mobile: "",
        address: "",
        roleId: 0,
        isActive: true
    })

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                username: userToEdit.username,
                name: userToEdit.name || "",
                password: "", // Don't fill password on edit
                code: userToEdit.code || "",
                mobile: userToEdit.mobile || "",
                address: userToEdit.address || "",
                roleId: userToEdit.roleId,
                isActive: userToEdit.isActive
            })
        } else {
            setFormData({
                username: "",
                name: "",
                password: "",
                code: "",
                mobile: "",
                address: "",
                roleId: roles.length > 0 ? roles[0].id : 0,
                isActive: true
            })
        }
    }, [userToEdit, roles, open])


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (userToEdit) {
                const updateData: UpdateUserDto = {
                    ...formData,
                    password: formData.password || undefined, // Only send password if updated
                    isActive: formData.isActive
                }
                await UserService.update(userToEdit.id, updateData)
            } else {
                await UserService.create(formData)
            }
            onSuccess()
            toast.success(userToEdit ? "Employee updated successfully" : "Employee created successfully")
        } catch (error) {
            console.error("Failed to save employee", error)
            toast.error("Failed to save employee")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{userToEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>
                    <DialogDescription>
                        {userToEdit ? "Update employee details." : "Create a new employee account here."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-left md:text-right">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-left md:text-right">
                                Username
                            </Label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-left md:text-right">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="col-span-3"
                                required={!userToEdit} // Required only for new users
                                placeholder={userToEdit ? "Leave blank to keep current" : ""}
                            />
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="role" className="text-left md:text-right">
                                Role
                            </Label>
                            <Select
                                value={formData.roleId.toString()}
                                onValueChange={(val) => setFormData({ ...formData, roleId: parseInt(val) })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map(role => (
                                        <SelectItem key={role.id} value={role.id.toString()}>
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-left md:text-right">
                                Code
                            </Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="mobile" className="text-left md:text-right">
                                Mobile
                            </Label>
                            <Input
                                id="mobile"
                                value={formData.mobile}
                                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid md:grid-cols-4 items-center gap-4">
                            <Label htmlFor="address" className="text-left md:text-right">
                                Address
                            </Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        {userToEdit && (
                            <div className="grid md:grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-left md:text-right">
                                    Status
                                </Label>
                                <Select
                                    value={formData.isActive ? "true" : "false"}
                                    onValueChange={(val) => setFormData({ ...formData, isActive: val === "true" })}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Active</SelectItem>
                                        <SelectItem value="false">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
