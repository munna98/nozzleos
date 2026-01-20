import { router, publicProcedure, protectedProcedure } from '@nozzleos/trpc'
import { loginSchema, refreshTokenSchema } from '@nozzleos/validators'
import { authService } from '../services/index.js'

export const authRouter = router({
    /**
     * Login with username and password
     */
    login: publicProcedure
        .input(loginSchema)
        .mutation(async ({ input }) => {
            return authService.login(input.username, input.password)
        }),

    /**
     * Refresh access token
     */
    refresh: publicProcedure
        .input(refreshTokenSchema)
        .mutation(async ({ input }) => {
            return authService.refreshTokens(input.refreshToken)
        }),

    /**
     * Logout - invalidate refresh token
     */
    logout: protectedProcedure.mutation(async ({ ctx }) => {
        return authService.logout(ctx.user.id)
    }),

    /**
     * Get current user info
     */
    me: protectedProcedure.query(async ({ ctx }) => {
        return authService.getUserProfile(ctx.user.id)
    }),
})
