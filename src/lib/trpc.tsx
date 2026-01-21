'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import superjson from 'superjson'
import { useState } from 'react'
import type { AppRouter } from '@/server/trpc/router'

export const trpc = createTRPCReact<AppRouter>()

function getBaseUrl() {
    if (typeof window !== 'undefined') return ''
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 1000,
                        refetchOnWindowFocus: false,
                    },
                },
            })
    )

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                    transformer: superjson,
                    // Include cookies for HTTP-only auth
                    fetch(url, options) {
                        return fetch(url, {
                            ...options,
                            credentials: 'include',
                        })
                    },
                }),
            ],
        })
    )

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    )
}
