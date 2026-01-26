'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Spinner } from '@/components/ui/spinner'

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
            if (user?.role === 'Fuel Attendant') {
                router.push('/dashboard')
            } else {
                router.push('/')
            }
        } else if (isAuthenticated) {
            // Role-based access control
            if (user?.role === 'Fuel Attendant') {
                // Filling attendants allowed routes
                const allowedRoutes = ['/dashboard', '/shift', '/reports/shift-history', '/profile']
                const isAllowed = allowedRoutes.some(route => pathname.startsWith(route))

                if (!isAllowed && pathname !== '/') {
                    // Redirect unauthorized pages to dashboard
                    router.push('/dashboard')
                } else if (pathname === '/') {
                    // Redirect root to dashboard
                    router.push('/dashboard')
                }
            } else {
                // Admin / Other roles
                // Admin does not need user dashboard
                if (pathname.startsWith('/dashboard')) {
                    router.push('/')
                }
            }
        }
    }, [isAuthenticated, isLoading, user, router, pathname])

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen"><Spinner className="size-8" /></div>
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
