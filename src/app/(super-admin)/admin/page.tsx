"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, Fuel, TrendingUp, Plus, Settings, ChevronRight, Copy } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

/**
 * Super Admin Dashboard
 * Overview of all stations and global statistics
 */
export default function SuperAdminDashboard() {
    const { data: stats, isLoading: statsLoading } = trpc.station.getStats.useQuery()
    const { data: stations, isLoading: stationsLoading } = trpc.station.getAll.useQuery()

    const isLoading = statsLoading || stationsLoading

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage all fuel stations across the platform
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/stations/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Station
                    </Link>
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stations</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats?.totalStations || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.activeStations || 0} active, {stats?.inactiveStations || 0} inactive
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats?.totalUsers || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Across all stations
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats?.totalShifts || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            All time records
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoading ? "..." : stats?.recentShifts || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Shifts in last 7 days
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Stations List */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Stations</CardTitle>
                            <CardDescription>All registered fuel stations</CardDescription>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/admin/stations">
                                View All
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {stationsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                    ) : stations && stations.length > 0 ? (
                        <div className="space-y-3">
                            {stations.slice(0, 5).map((station) => (
                                <div
                                    key={station.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Building2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{station.name}</p>
                                                {station.isActive ? (
                                                    <Badge variant="secondary" className="text-xs">Active</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-xs">Inactive</Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-sm text-muted-foreground">
                                                    {station.slug}.nozzleos.com
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${station.slug}.nozzleos.com`)
                                                        toast.success("Station URL copied")
                                                    }}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                    <span className="sr-only">Copy URL</span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                        <div className="text-center">
                                            <p className="font-medium text-foreground">{station._count.users}</p>
                                            <p className="text-xs">Users</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-foreground">{station._count.dispensers}</p>
                                            <p className="text-xs">Dispensers</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-foreground">{station._count.dutySessions}</p>
                                            <p className="text-xs">Shifts</p>
                                        </div>
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/admin/stations/${station.id}`}>
                                                <Settings className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                            <p className="mt-2 text-muted-foreground">No stations yet</p>
                            <Button className="mt-4" asChild>
                                <Link href="/admin/stations/new">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create First Station
                                </Link>
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
