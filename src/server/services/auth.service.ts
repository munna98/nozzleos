import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-min-32-characters-long'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-min-32-chars-long'

const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

interface TokenPayload {
    userId: number
    username: string
    role: string
}

export const authService = {
    /**
     * Login user and set HTTP-only cookies
     */
    async login(username: string, password: string, stationId: number | null) {
        const user = await prisma.user.findFirst({
            where: {
                username,
                stationId,
            },
            include: { role: true },
        })

        if (!user || !user.isActive) {
            throw new Error('Invalid credentials')
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash)
        if (!validPassword) {
            throw new Error('Invalid credentials')
        }

        const payload: TokenPayload = {
            userId: user.id,
            username: user.username,
            role: user.role.name,
        }

        const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
        const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })

        // Set HTTP-only cookies
        const cookieStore = await cookies()

        cookieStore.set('auth_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        })

        cookieStore.set('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        })

        // Set a readable cookie for middleware redirection (not httpOnly)
        cookieStore.set('user_role', user.role.name, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        })

        return {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role.name,
                roleId: user.roleId,
                stationId: user.stationId,
            },
        }
    },

    /**
     * Logout user by clearing cookies
     */
    async logout() {
        const cookieStore = await cookies()

        cookieStore.set('auth_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        })

        cookieStore.set('refresh_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        })

        cookieStore.set('user_role', '', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 0,
        })

        return { success: true }
    },

    /**
     * Refresh access token using refresh token from cookie
     */
    async refreshTokens() {
        const cookieStore = await cookies()
        const refreshToken = cookieStore.get('refresh_token')?.value

        if (!refreshToken) {
            throw new Error('No refresh token')
        }

        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as TokenPayload

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                include: { role: true },
            })

            if (!user || !user.isActive) {
                throw new Error('User not found or inactive')
            }

            const payload: TokenPayload = {
                userId: user.id,
                username: user.username,
                role: user.role.name,
            }

            const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
            const newRefreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY })

            cookieStore.set('auth_token', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: COOKIE_MAX_AGE,
            })

            cookieStore.set('refresh_token', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: COOKIE_MAX_AGE,
            })

            cookieStore.set('user_role', user.role.name, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: COOKIE_MAX_AGE,
            })

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role.name,
                    roleId: user.roleId,
                    stationId: user.stationId,
                },
            }
        } catch {
            throw new Error('Invalid refresh token')
        }
    },

    /**
     * Get current user profile
     */
    async getUserProfile(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        })

        if (!user) {
            throw new Error('User not found')
        }

        return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role.name,
            roleId: user.roleId,
            stationId: user.stationId,
        }
    },

    /**
     * Hash password for new user creation
     */
    async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, 10)
    },
}
