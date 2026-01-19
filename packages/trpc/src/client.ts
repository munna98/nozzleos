import { createTRPCClient, httpBatchLink } from '@trpc/client'
import superjson from 'superjson'

import type { AnyRouter } from '@trpc/server'

/**
 * Create a vanilla tRPC client
 * This is used for non-React contexts
 */
export function createClient<TRouter extends AnyRouter>(opts: {
    url: string
    getToken?: () => string | null
}) {
    return createTRPCClient<TRouter>({
        links: [
            httpBatchLink({
                url: opts.url,
                transformer: superjson as any,
                headers() {
                    const token = opts.getToken?.()
                    return token
                        ? { Authorization: `Bearer ${token}` }
                        : {}
                },
            }),
        ],
    })
}

export { httpBatchLink }
