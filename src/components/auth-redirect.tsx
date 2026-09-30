"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function AuthRedirect() {
    const { user, isAuthenticated, isLoading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (isLoading) return

        if (isAuthenticated && user) {
            const isAdmin = user.role === 'Admin' || user.role === 'Manager'
            if (isAdmin) {
                router.push('/admin-dashboard')
            } else {
                router.push('/dashboard')
            }
        }
    }, [isLoading, isAuthenticated, user, router])

    return null
}
