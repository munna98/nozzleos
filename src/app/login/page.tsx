'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { HugeiconsIcon } from "@hugeicons/react"
import { FuelStationIcon } from "@hugeicons/core-free-icons"
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const router = useRouter()

    // Station Logic
    const [stationSlug, setStationSlug] = useState<string | null>(null)
    const { data: station } = trpc.station.getPublicInfo.useQuery(
        { slug: stationSlug || '' },
        { enabled: !!stationSlug }
    )

    useEffect(() => {
        const host = window.location.hostname
        if (host.endsWith('.nozzleos.com') || (host.endsWith('localhost') && host !== 'localhost')) {
            const parts = host.split('.')
            if (parts.length > 2 || (host.includes('localhost') && parts.length > 1)) {
                setStationSlug(parts[0])
            }
        }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        // ... (existing submit logic) ...
        e.preventDefault()
        setLoading(true)

        try {
            const user = await login(username, password)
            toast.success('Logged in successfully')

            if (user?.role === 'Fuel Attendant') {
                router.push('/dashboard')
            } else {
                router.push('/')
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left side - Form */}
            <div className="flex items-center justify-center p-4 lg:p-8 bg-background">
                <div className="mx-auto w-full max-w-sm space-y-6">
                    <div className="flex flex-col space-y-2 text-center">
                        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <HugeiconsIcon icon={FuelStationIcon} className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">NozzleOS</h1>
                        <div className="text-sm text-muted-foreground">
                            {station ? (
                                <>
                                    Enter your credentials to login to <span className="font-bold text-foreground">{station.name}</span>
                                </>
                            ) : (
                                'Enter your credentials to login to NozzleOS'
                            )}
                        </div>
                    </div>

                    <Card className="border-0 shadow-none sm:border sm:shadow-sm">
                        <CardHeader className="space-y-1 pb-2">
                            <CardTitle className="text-xl">Sign In</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="username">
                                        Username
                                    </label>
                                    <Input
                                        id="username"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Enter your username"
                                        disabled={loading}
                                        required
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                                        Password
                                    </label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        disabled={loading}
                                        required
                                        className="h-10"
                                    />
                                </div>
                                <Button type="submit" className="w-full h-10" disabled={loading}>
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>


                </div>
            </div>

            {/* Right side - Branding/Image */}
            <div className="hidden bg-muted lg:block relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/10" />
                <div className="absolute inset-0 flex items-center justify-center p-12">
                    <div className="space-y-4 max-w-lg z-10">
                        <h2 className="text-4xl font-bold tracking-tight text-foreground">
                            Manage Your Fuel Station Efficiently
                        </h2>
                        <p className="text-lg text-muted-foreground">
                            Streamline your operations, track inventory and manage employees with NozzleOS.
                        </p>
                    </div>
                </div>
                {/* Decorative circles/patterns could go here */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-3xl -z-0" />
            </div>
        </div>
    )
}
