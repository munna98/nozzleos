"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Building2,
    Plus,
    Settings,
    Search,
    Users,
    Fuel,
    MoreVertical,
    ExternalLink,
    Copy
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { useState, useEffect } from "react"
import { toast } from "sonner"

/**
 * Stations List Page
 * View and manage all stations
 */
export default function StationsPage() {
    const [search, setSearch] = useState("")
    const [baseDomain, setBaseDomain] = useState("nozzleos.com")
    const { data: stations, isLoading } = trpc.station.getAll.useQuery({ includeInactive: true })

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

    const filteredStations = stations?.filter(station =>
        station.name.toLowerCase().includes(search.toLowerCase()) ||
        station.slug.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Stations</h1>
                    <p className="text-muted-foreground">
                        Manage all fuel stations on the platform
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/stations/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Station
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search stations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 max-w-sm"
                />
            </div>

            {/* Stations Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : filteredStations && filteredStations.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredStations.map((station) => (
                        <Card key={station.id} className="relative overflow-hidden">
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                {station.name}
                                                {!station.isActive && (
                                                    <Badge variant="destructive" className="text-xs">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <CardDescription className="text-xs">
                                                    {station.slug}.{baseDomain}
                                                </CardDescription>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 text-muted-foreground hover:text-foreground"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${station.slug}.${baseDomain}`)
                                                        toast.success("Station URL copied")
                                                    }}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                    <span className="sr-only">Copy URL</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/stations/${station.id}`}>
                                                    <Settings className="h-4 w-4 mr-2" />
                                                    Settings
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <a
                                                    href={`${window.location.protocol}//${station.slug}.${baseDomain}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Visit Portal
                                                </a>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {station.location && (
                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                                        📍 {station.location}
                                    </p>
                                )}
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="p-2 rounded-lg bg-muted/50">
                                        <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{station._count.users}</p>
                                        <p className="text-xs text-muted-foreground">Users</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted/50">
                                        <Fuel className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{station._count.fuels}</p>
                                        <p className="text-xs text-muted-foreground">Fuels</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted/50">
                                        <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                                        <p className="text-lg font-bold">{station._count.dispensers}</p>
                                        <p className="text-xs text-muted-foreground">Dispensers</p>
                                    </div>
                                    <div className="p-2 rounded-lg bg-muted/50">
                                        <p className="text-lg font-bold mt-3">{station._count.dutySessions}</p>
                                        <p className="text-xs text-muted-foreground">Shifts</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Button variant="outline" className="flex-1" asChild>
                                        <Link href={`/admin/stations/${station.id}`}>
                                            <Settings className="h-4 w-4 mr-2" />
                                            Manage
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="text-center py-12">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-4 text-lg font-medium">
                            {search ? "No stations match your search" : "No stations yet"}
                        </p>
                        <p className="text-muted-foreground">
                            {search
                                ? "Try a different search term"
                                : "Create your first station to get started"
                            }
                        </p>
                        {!search && (
                            <Button className="mt-4" asChild>
                                <Link href="/admin/stations/new">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Station
                                </Link>
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
