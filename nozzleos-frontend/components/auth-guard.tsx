'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (!isLoading && !isAuthenticated && pathname !== '/login') {
            router.push('/login')
        }
    }, [isAuthenticated, isLoading, router, pathname])

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    // If on login page and authenticated, redirect to home
    if (isAuthenticated && pathname === '/login') {
        router.push('/');
        return null;
    }

    // If not authenticated and not on login page, don't show children (will redirect)
    if (!isAuthenticated && pathname !== '/login') {
        return null
    }

    return <>{children}</>
}
