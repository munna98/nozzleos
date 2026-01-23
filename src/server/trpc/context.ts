import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
import { authService } from '@/server/services/auth.service'
import type { Context } from './init'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-characters-long'

interface JWTPayload {
    userId: number
    username: string
    role: string
}

export async function createContext(): Promise<Context> {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    // Helper to get user from token
    const getUserFromToken = async (token: string) => {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
        return prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true },
        })
    }

    try {
        if (!token) {
            throw new Error('No token')
        }

        const user = await getUserFromToken(token)

        if (!user || !user.isActive) {
            return { user: null }
        }

        return {
            user: {
                id: user.id,
                username: user.username,
                role: user.role.name,
            },
        }
    } catch {
        // Token invalid or expired, try to refresh
        try {
            const result = await authService.refreshTokens()
            return {
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    role: result.user.role,
                },
            }
        } catch {
            return { user: null }
        }
    }
}
