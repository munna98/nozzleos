import { cookies, headers } from 'next/headers'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { authService } from '@/server/services/auth.service'
import type { Context } from './init'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-characters-long'

interface JWTPayload {
    userId: number
    username: string
    role: string
    stationId?: number | null
}

/**
 * Extracts station slug from the request
 * Priority: 1. Subdomain (production) 2. Query param (development) 3. Cookie
 */
async function getStationFromRequest(): Promise<{ stationId: number | null; slug: string | null }> {
    const headersList = await headers()
    const host = headersList.get('host') || ''
    const cookieStore = await cookies()

    // Production domains
    const productionDomains = ['nozzleos.com', 'nozzleos.vercel.app']

    // Try to extract subdomain from host
    let slug: string | null = null

    // Check if it's a subdomain request (e.g., nk-petroleum.nozzleos.com)
    for (const domain of productionDomains) {
        if (host.endsWith(domain)) {
            const subdomain = host.replace(`.${domain}`, '').replace(':3000', '')
            if (subdomain && subdomain !== 'www' && subdomain !== 'admin') {
                slug = subdomain
                break
            }
        }
    }

    // For localhost development, try to extract subdomain first
    if (!slug && host.includes('localhost')) {
        const parts = host.split('.')
        // e.g. "nk-petroleum.localhost:3000" -> ["nk-petroleum", "localhost:3000"]
        if (parts.length >= 2 && parts[1].startsWith('localhost')) {
            const subdomain = parts[0]
            if (subdomain !== 'www' && subdomain !== 'admin') {
                slug = subdomain
            }
        }

        // Fallback to cookie if no subdomain found
        if (!slug) {
            slug = cookieStore.get('current_station')?.value || null
        }
    } else if (!slug && host.includes('127.0.0.1')) {
        // Fallback for IP access
        slug = cookieStore.get('current_station')?.value || null
    }

    // If we have a slug, look up the station
    if (slug) {
        const station = await prisma.station.findUnique({
            where: { slug },
            select: { id: true }
        })
        if (station) {
            return { stationId: station.id, slug }
        }
    }

    return { stationId: null, slug: null }
}

export async function createContext(): Promise<Context> {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    // Get station context from request
    const { stationId: requestStationId } = await getStationFromRequest()

    // Helper to get user from token
    const getUserFromToken = async (token: string) => {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
        return prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true },
        })
    }

    // Default context for unauthenticated users
    const defaultContext: Context = {
        user: null,
        stationId: requestStationId,
        isSuperAdmin: false,
    }

    try {
        if (!token) {
            return defaultContext
        }

        const user = await getUserFromToken(token)

        if (!user || !user.isActive) {
            return defaultContext
        }

        const isSuperAdmin = user.role.name === 'Super Admin'

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role.name,
                stationId: user.stationId,
            },
            // For super admins, use the request station; for regular users, use their assigned station
            stationId: isSuperAdmin ? requestStationId : (user.stationId ?? requestStationId),
            isSuperAdmin,
        }
    } catch {
        // Token invalid or expired, try to refresh
        try {
            const result = await authService.refreshTokens()
            const isSuperAdmin = result.user.role === 'Super Admin'

            return {
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    role: result.user.role,
                    stationId: result.user.stationId ?? null,
                },
                stationId: isSuperAdmin ? requestStationId : (result.user.stationId ?? requestStationId),
                isSuperAdmin,
            }
        } catch {
            return defaultContext
        }
    }
}
