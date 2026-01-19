import { z } from 'zod'

// ============ Auth Schemas ============
export const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
})

export const tokenSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string().optional(),
})

export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type TokenOutput = z.infer<typeof tokenSchema>
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>
