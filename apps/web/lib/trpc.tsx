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
 * Mutable auth state
 */
let accessToken: string | null = null
let refreshToken: string | null = null
let logoutCallback: (() => void) | null = null
let tokenRefreshCallback: ((newAccess: string, newRefresh: string) => void) | null = null
let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null

/**
 * Set the auth tokens - called by AuthProvider
 */
export function setAuthTokens(access: string | null, refresh: string | null): void {
    accessToken = access
    refreshToken = refresh
}

/**
 * Register logout callback
 */
export function setLogoutCallback(callback: () => void): void {
    logoutCallback = callback
}

/**
 * Register token refresh callback
 */
export function setTokenRefreshCallback(callback: (newAccess: string, newRefresh: string) => void): void {
    tokenRefreshCallback = callback
}

/**
 * Custom fetch wrapper to handle token refresh (Concurrency safe)
 */
async function fetchWithAuth(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
    const originalFetch = fetch

    // attach token
    const headers = new Headers(options?.headers)
    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const response = await originalFetch(url, { ...options, headers })

    if (response.status === 401) {
        if (!refreshToken) {
            logoutCallback?.()
            return response
        }

        try {
            // If already refreshing, wait for it
            if (!refreshPromise) {
                refreshPromise = (async () => {
                    const refreshUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/trpc/auth.refresh`
                    const refreshRes = await originalFetch(refreshUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            json: { refreshToken }
                        }),
                    })

                    if (!refreshRes.ok) {
                        throw new Error('Refresh failed')
                    }

                    const data = await refreshRes.json()
                    // Extract result from tRPC response structure: { result: { data: { json: ... } } }
                    // Based on standard tRPC response with superjson
                    // Note: If using superjson, the response body structure is slightly complex.
                    // However, we are making a "raw" call but expecting a tRPC formatted response.
                    // Let's rely on the fact that we can parse the JSON.
                    // The standard successful response: { result: { data: { accessToken: "...", refreshToken: "..." } } }
                    // If superjson is used, it might be { result: { data: { json: { ... } } } }

                    // Let's inspect the typically expected structure.
                    // For safety, let's try to extract what we can or rely on standard structure.
                    // Assuming superjson is enabled on backend:
                    const result = data.result?.data?.json || data.result?.data

                    if (result?.accessToken && result?.refreshToken) {
                        return { accessToken: result.accessToken, refreshToken: result.refreshToken }
                    }
                    throw new Error('Invalid refresh response')
                })()
            }

            const tokens = await refreshPromise

            // If we are here, refresh succeeded
            // Important: We actually need to update the global `accessToken` here 
            // so the retried request uses it. 
            // But `setAuthTokens` is called by AuthProvider usually.
            // We should update our local ref at least for the retry.
            // And ideally trigger a callback to update React state?
            // Since we can't easily trigger React state update from here without a callback,
            // we will update local var and hope AuthContext picks it up or we add a "tokensRefreshed" callback.
            // Actually, we can just update the local variable `accessToken` here for the retry.
            // The AuthProvider won't know about the new token immediately unless we notify it.
            // This might cause a desync.

            // Let's assume for now we just retry. The next render might still have old token if we don't sync.
            // Ideally we need `onTokensRefreshed` callback.

            // For now, let's update internal state
            // (The `refreshPromise` logic holds the single source of truth for the *new* token during this burst)
            accessToken = tokens.accessToken
            refreshToken = tokens.refreshToken
            // Notify AuthProvider if callback is registered
            tokenRefreshCallback?.(tokens.accessToken, tokens.refreshToken)

            refreshPromise = null

            // Retry original request
            const newHeaders = new Headers(options?.headers)
            newHeaders.set('Authorization', `Bearer ${tokens.accessToken}`)
            return originalFetch(url, { ...options, headers: newHeaders })

        } catch (error) {
            refreshPromise = null
            logoutCallback?.()
            return response // Return the original 401
        }
    }

    return response
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
                        retry: (failureCount, error: any) => {
                            // Don't retry on 401s as the custom fetch handles it?
                            // Actually custom fetch handles the refresh retry.
                            // If custom fetch returns 401, it means refresh failed.
                            if (error?.data?.httpStatus === 401) return false
                            return failureCount < 3
                        }
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
                    // We don't need headers() here if we use custom fetch that handles it?
                    // Actually httpBatchLink merges headers. 
                    // But if we do custom fetch, we can handle headers there entirely and return {} here.
                    headers() {
                        return {}
                    },
                    fetch: fetchWithAuth
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
