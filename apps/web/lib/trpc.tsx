'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import { useState } from 'react'
import superjson from 'superjson'
import type { AppRouter } from '@nozzleos/api'

/**
 * tRPC React hooks
 */
export const trpc = createTRPCReact<AppRouter>()

/**
 * Mutable auth token that can be updated by AuthProvider
 * This ensures tRPC always has the current token in sync with React state
 */
let authToken: string | null = null

/**
 * Set the auth token - called by AuthProvider when auth state changes
 */
export function setAuthToken(token: string | null): void {
    authToken = token
}

/**
 * Get the current auth token
 */
function getAuthToken(): string | null {
    // First try the synchronized token from AuthProvider
    if (authToken) return authToken

    // Fallback to localStorage for initial hydration
    if (typeof window === 'undefined') return null
    try {
        const stored = localStorage.getItem('auth')
        if (stored) {
            const { accessToken } = JSON.parse(stored)
            return accessToken
        }
    } catch {
        console.error('Error getting auth token')
    }
    return null
}

/**
 * tRPC + React Query Provider
 */
export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 1000, // 5 seconds
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/trpc`,
                    transformer: superjson,
                    headers() {
                        const token = getAuthToken()
                        return token ? { Authorization: `Bearer ${token}` } : {}
                    },
                }),
            ],
        })
    )

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </trpc.Provider>
    )
}
