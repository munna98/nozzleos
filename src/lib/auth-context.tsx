'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'

interface User {
    id: number
    username: string
    name: string | null
    role: string
    roleId: number
}

interface AuthContextType {
    user: User | null
    isLoading: boolean
    login: (username: string, password: string) => Promise<User>
    logout: () => Promise<void>
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()
    const utils = trpc.useUtils()

    const loginMutation = trpc.auth.login.useMutation()
    const logoutMutation = trpc.auth.logout.useMutation()

    // Check auth status on mount
    const meQuery = trpc.auth.me.useQuery(undefined, {
        retry: false,
        enabled: true,
    })

    useEffect(() => {
        if (meQuery.data) {
            setUser(meQuery.data)
        }
        if (!meQuery.isLoading) {
            setIsLoading(false)
        }
    }, [meQuery.data, meQuery.isLoading])

    const login = useCallback(async (username: string, password: string): Promise<User> => {
        const result = await loginMutation.mutateAsync({ username, password })
        setUser(result.user)
        utils.invalidate()
        return result.user
    }, [loginMutation, utils])

    const logout = useCallback(async () => {
        try {
            await logoutMutation.mutateAsync()
        } catch (error) {
            console.error('Logout error:', error)
        }
        setUser(null)
        utils.invalidate()
        router.push('/login')
    }, [logoutMutation, utils, router])

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                logout,
                isAuthenticated: !!user,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}
