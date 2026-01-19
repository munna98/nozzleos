'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated, isLoading } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        if (isLoading) return

        if (!isAuthenticated && pathname !== '/login') {
            router.push('/login')
        } else if (isAuthenticated && pathname === '/login') {
            // Role-based routing after login
            if (user?.role === 'Filling Attendant') {
                router.push('/shift')
            } else {
                router.push('/')
            }
        } else if (isAuthenticated && user?.role === 'Filling Attendant') {
            // Filling attendants can only access the shift page
            if (pathname !== '/shift') {
                router.push('/shift')
            }
        }
    }, [isAuthenticated, isLoading, user, router, pathname])

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>
    }

    // If on login page and authenticated, redirect based on role
    if (isAuthenticated && pathname === '/login') {
        return null;
    }

    // If not authenticated and not on login page, don't show children (will redirect)
    if (!isAuthenticated && pathname !== '/login') {
        return null
    }

    return <>{children}</>
}
