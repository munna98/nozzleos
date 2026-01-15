'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

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

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('auth')
        if (stored) {
            const { accessToken, refreshToken, user } = JSON.parse(stored)
            setAccessToken(accessToken)
            setRefreshToken(refreshToken)
            setUser(user)
        }
        setIsLoading(false)
    }, [])

    // Setup axios interceptor for auto token refresh
    useEffect(() => {
        if (!accessToken) return

        const interceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config

                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true

                    try {
                        const response = await axios.post('http://localhost:5000/auth/refresh', { refreshToken })
                        const newToken = response.data.accessToken
                        setAccessToken(newToken)
                        originalRequest.headers.Authorization = `Bearer ${newToken}`
                        return axios(originalRequest)
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
            // Ensure base URL is set if not already global
            if (!axios.defaults.baseURL) {
                axios.defaults.baseURL = 'http://localhost:5000';
            }
        } else {
            delete axios.defaults.headers.common['Authorization']
            axios.defaults.baseURL = 'http://localhost:5000'; // Ensure base URL is always set
        }
    }, [accessToken])

    // Set initial base URL
    useEffect(() => {
        axios.defaults.baseURL = 'http://localhost:5000';
    }, [])

    const login = async (username: string, password: string) => {
        try {
            const response = await axios.post('/auth/login', { username, password })
            const { accessToken, refreshToken, user } = response.data

            setAccessToken(accessToken)
            setRefreshToken(refreshToken)
            setUser(user)

            localStorage.setItem(
                'auth',
                JSON.stringify({ accessToken, refreshToken, user })
            )
        } catch (error) {
            throw error
        }
    }

    const logout = async () => {
        try {
            if (refreshToken) {
                await axios.post('/auth/logout', { refreshToken })
            }
        } catch (error) {
            console.error('Logout error:', error)
        }

        setAccessToken(null)
        setRefreshToken(null)
        setUser(null)
        localStorage.removeItem('auth')
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
