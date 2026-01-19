import { z } from 'zod'

// ============ User Role ============
export const userRoleSchema = z.object({
    id: z.number(),
    name: z.string(),
})

export type UserRole = z.infer<typeof userRoleSchema>

// ============ User ============
export const userSchema = z.object({
    id: z.number(),
    username: z.string().min(1, 'Username is required'),
    name: z.string().nullable().optional(),
    code: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
    roleId: z.number(),
    role: userRoleSchema.optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

export const createUserSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    name: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    code: z.string().optional(),
    mobile: z.string().optional(),
    address: z.string().optional(),
    roleId: z.number(),
    isActive: z.boolean().optional(),
})

export const updateUserSchema = createUserSchema.partial()

export type User = z.infer<typeof userSchema>
export type CreateUser = z.infer<typeof createUserSchema>
export type UpdateUser = z.infer<typeof updateUserSchema>
