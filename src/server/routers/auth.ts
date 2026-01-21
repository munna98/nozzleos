import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc/init'
import { authService } from '../services/auth.service'

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
            return authService.login(input.username, input.password)
        }),

    /**
     * Refresh access token
     */
    refresh: publicProcedure.mutation(async () => {
        return authService.refreshTokens()
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
