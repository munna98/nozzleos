"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"

/**
 * Create New Station Page
 */
export default function NewStationPage() {
    const router = useRouter()
    const [baseDomain, setBaseDomain] = useState("nozzleos.com")
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        location: "",
        mobile: "",
        email: "",
    })

    useEffect(() => {
        const host = window.location.hostname
        const productionDomains = ['nozzleos.com', 'nozzleos.vercel.app']
        const matchedDomain = productionDomains.find(d => host.endsWith(d))

        if (matchedDomain) {
            setBaseDomain(matchedDomain)
        } else if (host.includes('localhost')) {
            const port = window.location.port
            setBaseDomain(`localhost${port ? `:${port}` : ''}`)
        }
    }, [])

    const createStation = trpc.station.create.useMutation({
        onSuccess: () => {
            toast.success(`Station created! Admin credentials: ${formData.slug}/${formData.slug}`)
            router.push("/admin/stations")
        },
        onError: (error) => {
            toast.error(error.message)
        }
    })

    // Auto-generate slug from name
    const handleNameChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            name: value,
            slug: value
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .slice(0, 50)
        }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.name.trim()) {
            toast.error("Station name is required")
            return
        }

        if (!formData.slug.trim()) {
            toast.error("Station slug is required")
            return
        }

        createStation.mutate({
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            location: formData.location.trim() || undefined,
            mobile: formData.mobile.trim() || undefined,
            email: formData.email.trim() || undefined,
        })
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/stations">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Create Station</h1>
                    <p className="text-muted-foreground">
                        Add a new fuel station to the platform
                    </p>
                </div>
            </div>

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Station Details</CardTitle>
                    <CardDescription>
                        Enter the basic information for the new station
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Station Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., NK Petroleum"
                                value={formData.name}
                                onChange={(e) => handleNameChange(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">URL Slug *</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="slug"
                                    placeholder="e.g., nk-petroleum"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                    }))}
                                    className="flex-1"
                                />
                                <span className="text-sm text-muted-foreground">.{baseDomain}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Only lowercase letters, numbers, and hyphens allowed
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location / Address</Label>
                            <Input
                                id="location"
                                placeholder="e.g., 123 Main Street, City"
                                value={formData.location}
                                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mobile">Phone Number</Label>
                                <Input
                                    id="mobile"
                                    placeholder="e.g., +91 9876543210"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="e.g., contact@station.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/admin/stations")}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createStation.isPending}
                            >
                                {createStation.isPending && (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                Create Station
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-muted/50">
                <CardContent className="pt-6">
                    <h3 className="font-medium mb-2">What happens when you create a station?</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• A unique subdomain is created ({formData.slug || 'slug'}.{baseDomain})</li>
                        <li>• Default settings are configured for the station</li>
                        <li>• A Cash payment method is automatically added</li>
                        <li>• An Admin user is auto-created (User/Pass: {formData.slug || 'slug'})</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}
