'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { trpc, setAuthToken } from '@/lib/trpc'

interface User {
    id: number
    username: string
    name: string
    role: string
    roleId: number
}

interface AuthContextType {
    user: User | null
    accessToken: string | null
    isLoading: boolean
    login: (username: string, password: string) => Promise<void>
    logout: () => Promise<void>
    isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [refreshToken, setRefreshToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const loginMutation = trpc.auth.login.useMutation()
    const logoutMutation = trpc.auth.logout.useMutation()
    const utils = trpc.useUtils()

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('auth')
        if (stored) {
            try {
                const { accessToken, refreshToken, user } = JSON.parse(stored)
                setAccessToken(accessToken)
                setRefreshToken(refreshToken)
                setUser(user)
                // Sync token with tRPC
                setAuthToken(accessToken)
            } catch (e) {
                console.error('Failed to parse auth from local storage', e)
                localStorage.removeItem('auth')
            }
        }
        setIsLoading(false)
    }, [])

    // Setup axios interceptor for auto token refresh (Legacy support)
    // Note: This logic needs to be eventually replaced with a tRPC link
    useEffect(() => {
        if (!accessToken) return

        const interceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true
                    try {
                        // TODO: Migrate refresh logic to tRPC vanilla client if possible
                        // For now we logout on 401 to force re-login as temp fix until refresh link is built
                        logout()
                        return Promise.reject(error)
                    } catch (refreshError) {
                        logout()
                        return Promise.reject(refreshError)
                    }
                }
                return Promise.reject(error)
            }
        )

        return () => axios.interceptors.response.eject(interceptor)
    }, [accessToken, refreshToken])

    // Setup axios default header
    useEffect(() => {
        if (accessToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
            if (!axios.defaults.baseURL) {
                axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            }
        } else {
            delete axios.defaults.headers.common['Authorization']
            axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
        }
    }, [accessToken])

    // Set initial base URL
    useEffect(() => {
        axios.defaults.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    }, [])

    const login = async (username: string, password: string) => {
        try {
            const response = await loginMutation.mutateAsync({ username, password })
            const { accessToken, refreshToken, user: userDto } = response

            // Map UserDto to User interface (handling potential mis-matches)
            const user: User = {
                id: userDto.id,
                username: userDto.username,
                name: userDto.name || '',
                role: userDto.role,
                roleId: userDto.roleId
            }

            setAccessToken(accessToken)
            setRefreshToken(refreshToken)
            setUser(user)

            // Sync token with tRPC
            setAuthToken(accessToken)

            localStorage.setItem(
                'auth',
                JSON.stringify({ accessToken, refreshToken, user })
            )

            // Invalidate queries
            utils.invalidate()
        } catch (error) {
            throw error
        }
    }

    const logout = async () => {
        try {
            if (accessToken) {
                await logoutMutation.mutateAsync()
            }
        } catch (error) {
            console.error('Logout error:', error)
        }

        setAccessToken(null)
        setRefreshToken(null)
        setUser(null)
        localStorage.removeItem('auth')

        // Clear token from tRPC
        setAuthToken(null)
        utils.invalidate()
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                isLoading,
                login,
                logout,
                isAuthenticated: !!user
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}
