import { router, publicProcedure, protectedProcedure } from '@nozzleos/trpc'
import { prisma } from '@nozzleos/db'
import { loginSchema, refreshTokenSchema } from '@nozzleos/validators'
import { TRPCError } from '@trpc/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'

function generateTokens(user: { id: number; username: string; role: { name: string } }) {
    const accessToken = jwt.sign(
        { userId: user.id, username: user.username, role: user.role.name },
        JWT_SECRET,
        { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
        { userId: user.id },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    )

    return { accessToken, refreshToken }
}

export const authRouter = router({
    /**
     * Login with username and password
     */
    login: publicProcedure
        .input(loginSchema)
        .mutation(async ({ input }) => {
            const user = await prisma.user.findUnique({
                where: { username: input.username },
                include: { role: true },
            })

            if (!user || !user.isActive) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Invalid username or password',
                })
            }

            const validPassword = await bcrypt.compare(input.password, user.passwordHash)
            if (!validPassword) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Invalid username or password',
                })
            }

            const tokens = generateTokens(user)

            // Store refresh token in database
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7)

            await prisma.refreshToken.create({
                data: {
                    userId: user.id,
                    token: tokens.refreshToken,
                    expiresAt,
                },
            })

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role.name,
                    roleId: user.roleId,
                },
                ...tokens,
            }
        }),

    /**
     * Refresh access token
     */
    refresh: publicProcedure
        .input(refreshTokenSchema)
        .mutation(async ({ input }) => {
            try {
                const decoded = jwt.verify(input.refreshToken, JWT_REFRESH_SECRET) as { userId: number }

                const storedToken = await prisma.refreshToken.findUnique({
                    where: { token: input.refreshToken },
                    include: { user: { include: { role: true } } },
                })

                if (!storedToken || storedToken.expiresAt < new Date()) {
                    throw new TRPCError({
                        code: 'UNAUTHORIZED',
                        message: 'Invalid or expired refresh token',
                    })
                }

                const tokens = generateTokens(storedToken.user)

                // Update refresh token
                await prisma.refreshToken.update({
                    where: { id: storedToken.id },
                    data: {
                        token: tokens.refreshToken,
                        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    },
                })

                return tokens
            } catch {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Invalid refresh token',
                })
            }
        }),

    /**
     * Logout - invalidate refresh token
     */
    logout: protectedProcedure.mutation(async ({ ctx }) => {
        await prisma.refreshToken.deleteMany({
            where: { userId: ctx.user.id },
        })
        return { success: true }
    }),

    /**
     * Get current user info
     */
    me: protectedProcedure.query(async ({ ctx }) => {
        const user = await prisma.user.findUnique({
            where: { id: ctx.user.id },
            include: { role: true },
        })

        if (!user) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'User not found',
            })
        }

        return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role.name,
            roleId: user.roleId,
        }
    }),
})
