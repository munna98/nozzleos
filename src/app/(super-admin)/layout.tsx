"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Super Admin Layout
 * Only accessible to users with Super Admin role
 */
export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { user, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!isLoading && (!user || user.role !== 'Super Admin')) {
            router.push('/login')
        }
    }, [user, isLoading, router])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!user || user.role !== 'Super Admin') {
        return null
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Super Admin Header */}
            {/* Super Admin Header removed in favor of global TopNav */}
            {/* <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center px-4">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                            <span className="text-white font-bold text-sm">SA</span>
                        </div>
                        <div>
                            <h1 className="font-semibold text-lg">NozzleOS</h1>
                            <p className="text-xs text-muted-foreground -mt-0.5">Super Admin Portal</p>
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {user.name || user.username}
                        </span>
                    </div>
                </div>
            </header> */}

            <main className="container mx-auto px-4 py-6">
                {children}
            </main>
        </div>
    )
}
