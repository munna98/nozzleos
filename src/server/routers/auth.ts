import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc/init'
import { authService } from '../services/auth.service'
import { TRPCError } from '@trpc/server'

export const authRouter = router({
    /**
     * Login with username and password
     */
    login: publicProcedure
        .input(z.object({
            username: z.string().min(1),
            password: z.string().min(1),
        }))
        .mutation(async ({ input }) => {
            try {
                return await authService.login(input.username, input.password)
            } catch (error) {
                console.error('Login error:', error)
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: error instanceof Error ? error.message : 'Login failed',
                })
            }
        }),

    /**
     * Refresh access token
     */
    refresh: publicProcedure.mutation(async () => {
        try {
            return await authService.refreshTokens()
        } catch (error) {
            console.error('Refresh error:', error)
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Session expired. Please login again.',
            })
        }
    }),

    /**
     * Logout - clear cookies
     */
    logout: protectedProcedure.mutation(async () => {
        return authService.logout()
    }),

    /**
     * Get current user info
     */
    me: protectedProcedure.query(async ({ ctx }) => {
        return authService.getUserProfile(ctx.user.id)
    }),
})
