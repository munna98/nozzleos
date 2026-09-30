import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for multi-tenancy subdomain routing
 * 
 * Handles:
 * - admin.nozzleos.com → Super admin portal
 * - {slug}.nozzleos.com → Station portal
 * - localhost:3000 → Development mode (uses cookie for station selection)
 */
export function middleware(request: NextRequest) {
    const host = request.headers.get('host') || ''
    const pathname = request.nextUrl.pathname

    // Skip middleware for API routes, static files, and Next.js internals
    if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/_next') ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.')
    ) {
        return NextResponse.next()
    }

    // Production domains
    const productionDomains = ['nozzleos.com', 'nozzleos.vercel.app']

    let subdomain: string | null = null
    let isAdminSubdomain = false

    // Extract subdomain from production domains
    for (const domain of productionDomains) {
        if (host.endsWith(domain)) {
            const hostParts = host.replace(`:${request.nextUrl.port}`, '').split('.')
            if (hostParts.length > domain.split('.').length) {
                subdomain = hostParts[0]
                isAdminSubdomain = subdomain === 'admin'
                break
            }
        }
    }

    // For localhost, handle subdomain parsing manually since it's not a production domain
    if (host.includes('localhost')) {
        const parts = host.split('.')
        // e.g. "admin.localhost:3000" or "nk-petroleum.localhost:3000"
        if (parts.length >= 2 && parts[1].startsWith('localhost')) {
            subdomain = parts[0]
            isAdminSubdomain = subdomain === 'admin'
        }
    }

    // Handle admin subdomain routing
    if (isAdminSubdomain) {
        // Rewrite root requests to /admin to show the dashboard
        if (pathname === '/') {
            const url = request.nextUrl.clone()
            url.pathname = '/admin'
            return NextResponse.rewrite(url)
        }
        return NextResponse.next()
    }

    // Handle Authenticated Redirects on Root Path
    if (pathname === '/') {
        const authToken = request.cookies.get('auth_token')?.value
        const userRole = request.cookies.get('user_role')?.value

        if (authToken) {
            const url = request.nextUrl.clone()

            // Default to staff dashboard, but upgrade to admin if role matches
            if (userRole === 'Admin' || userRole === 'Manager') {
                url.pathname = '/admin-dashboard'
            } else {
                url.pathname = '/dashboard'
            }

            return NextResponse.redirect(url)
        }
    }

    // Handle station subdomain routing
    if (subdomain && subdomain !== 'www') {
        // Set station slug in header for the tRPC context to pick up
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-station-slug', subdomain)

        return NextResponse.next({
            headers: requestHeaders,
        })
    }

    // No subdomain on production - redirect to main site or show station selector
    // For now, just continue (could redirect to a station selector page)
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
