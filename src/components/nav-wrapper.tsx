'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from "@/components/top-nav"
import { useAuth } from '@/lib/auth-context'

export function NavWrapper() {
    const pathname = usePathname()
    const { isAuthenticated } = useAuth()

    // Don't show nav on login page
    if (pathname === '/login') {
        return null
    }

    // Optional: Don't show nav if not authenticated (though AuthGuard handles redirect, 
    // this prevents a flash if AuthGuard allows render for some reason)
    if (!isAuthenticated) {
        return null
    }

    return <TopNav />
}
