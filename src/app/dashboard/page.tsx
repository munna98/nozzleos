"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { FuelStationIcon, TimeQuarterPassIcon } from "@hugeicons/core-free-icons"
import { useAuth } from "@/lib/auth-context"

export default function DashboardPage() {
    const router = useRouter()
    const { user } = useAuth()

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">
                    Welcome{user?.name ? `, ${user.name}` : ''}
                </h1>
                <p className="text-muted-foreground mt-1">
                    What would you like to do today?
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-2xl">
                {/* Start New Shift */}
                <Card className="cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => router.push('/shift')}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <HugeiconsIcon icon={FuelStationIcon} className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Start New Shift</CardTitle>
                                <CardDescription>Begin a new duty shift</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" size="lg">
                            Start Shift
                        </Button>
                    </CardContent>
                </Card>

                {/* View Shift History */}
                <Card className="cursor-pointer hover:border-primary/50 transition-colors group" onClick={() => router.push('/reports/shift-history')}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                <HugeiconsIcon icon={TimeQuarterPassIcon} className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Shift History</CardTitle>
                                <CardDescription>View past shift records</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" size="lg">
                            View History
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
