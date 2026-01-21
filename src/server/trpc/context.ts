import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import prisma from '@/lib/prisma'
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

    if (!token) {
        return { user: null }
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

        // Verify user still exists and is active
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true },
        })

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
        return { user: null }
    }
}
