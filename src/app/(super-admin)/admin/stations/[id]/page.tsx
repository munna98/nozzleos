"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    ArrowLeft,
    Loader2,
    Building2,
    Users,
    Fuel,
    ExternalLink,
    AlertTriangle
} from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"

/**
 * Station Details / Edit Page
 */
export default function StationDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const stationId = Number(params.id)

    const { data: station, isLoading, refetch } = trpc.station.getById.useQuery(
        { id: stationId },
        { enabled: !isNaN(stationId) }
    )

    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        location: "",
        mobile: "",
        email: "",
        isActive: true,
    })
    const [hasChanges, setHasChanges] = useState(false)

    // Populate form when data loads
    useEffect(() => {
        if (station) {
            setFormData({
                name: station.name,
                slug: station.slug,
                location: station.location || "",
                mobile: station.mobile || "",
                email: station.email || "",
                isActive: station.isActive,
            })
        }
    }, [station])

    // Detect changes
    useEffect(() => {
        if (station) {
            const changed =
                formData.name !== station.name ||
                formData.slug !== station.slug ||
                formData.location !== (station.location || "") ||
                formData.mobile !== (station.mobile || "") ||
                formData.email !== (station.email || "") ||
                formData.isActive !== station.isActive
            setHasChanges(changed)
        }
    }, [formData, station])

    const updateStation = trpc.station.update.useMutation({
        onSuccess: () => {
            toast.success("Station updated successfully!")
            refetch()
            setHasChanges(false)
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    const deleteStation = trpc.station.delete.useMutation({
        onSuccess: (result) => {
            toast.success(result.message)
            router.push("/admin/stations")
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        updateStation.mutate({
            id: stationId,
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            location: formData.location.trim() || null,
            mobile: formData.mobile.trim() || null,
            email: formData.email.trim() || null,
            isActive: formData.isActive,
        })
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!station) {
        return (
            <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-lg font-medium">Station not found</p>
                <Button className="mt-4" asChild>
                    <Link href="/admin/stations">Back to Stations</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/stations">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold">{station.name}</h1>
                        {!station.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        {station.slug}.nozzleos.com
                    </p>
                </div>
                <Button variant="outline" asChild>
                    <a
                        href={`https://${station.slug}.nozzleos.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Portal
                    </a>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{station._count.users}</p>
                                <p className="text-sm text-muted-foreground">Users</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Fuel className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{station._count.fuels}</p>
                                <p className="text-sm text-muted-foreground">Fuels</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{station._count.dispensers}</p>
                                <p className="text-sm text-muted-foreground">Dispensers</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{station._count.dutySessions}</p>
                                <p className="text-sm text-muted-foreground">Shifts</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Station Settings</CardTitle>
                    <CardDescription>
                        Update the station&apos;s information
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Station Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        name: e.target.value
                                    }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">URL Slug</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="slug"
                                        value={formData.slug}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                        }))}
                                        className="flex-1"
                                    />
                                    <span className="text-sm text-muted-foreground">.nozzleos.com</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location / Address</Label>
                            <Input
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    location: e.target.value
                                }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mobile">Phone Number</Label>
                                <Input
                                    id="mobile"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        mobile: e.target.value
                                    }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        email: e.target.value
                                    }))}
                                />
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Station Active</Label>
                                <p className="text-sm text-muted-foreground">
                                    Inactive stations cannot be accessed by users
                                </p>
                            </div>
                            <Switch
                                checked={formData.isActive}
                                onCheckedChange={(checked) => setFormData(prev => ({
                                    ...prev,
                                    isActive: checked
                                }))}
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                disabled={!hasChanges || updateStation.isPending}
                            >
                                {updateStation.isPending && (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
                    </CardTitle>
                    <CardDescription>
                        Irreversible actions for this station
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Delete Station</p>
                            <p className="text-sm text-muted-foreground">
                                {station._count.dutySessions > 0
                                    ? "This station has shift history and will be deactivated instead of deleted"
                                    : "Permanently delete this station and all its data"
                                }
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    Delete Station
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {station._count.dutySessions > 0
                                            ? `This station has ${station._count.dutySessions} shift records and cannot be permanently deleted. It will be deactivated instead.`
                                            : "This action cannot be undone. This will permanently delete the station and all associated data."
                                        }
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => deleteStation.mutate({ id: stationId })}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        {deleteStation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : station._count.dutySessions > 0 ? (
                                            "Deactivate Station"
                                        ) : (
                                            "Delete Station"
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
