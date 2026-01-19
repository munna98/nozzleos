import type { Context } from '@nozzleos/trpc'
import type { Request } from 'express'
import { prisma } from '@nozzleos/db'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface JWTPayload {
    userId: number
    username: string
    role: string
}

/**
 * Create tRPC context from Express request
 */
export async function createContext({ req }: { req: Request }): Promise<Context> {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
        return { user: null }
    }

    const token = authHeader.split(' ')[1]

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

        // Verify user exists and is active
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
