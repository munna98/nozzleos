import { z } from 'zod'
import { router, adminProcedure, protectedProcedure, TRPCError } from '../trpc/init'
import { authService } from '../services/auth.service'
import prisma from '@/lib/prisma'

export const userRouter = router({
    /**
     * Get all users (admin only)
     */
    getAll: adminProcedure
        .input(z.object({
            role: z.string().optional(),
        }).optional())
        .query(async ({ input }) => {
            const where: any = { deletedAt: null }

            if (input?.role) {
                where.role = {
                    name: input.role
                }
            }

            const users = await prisma.user.findMany({
                where,
                include: { role: true },
                orderBy: { createdAt: 'desc' },
            })
            return users.map(user => ({
                id: user.id,
                username: user.username,
                name: user.name,
                code: user.code,
                mobile: user.mobile,
                isActive: user.isActive,
                address: user.address,
                role: user.role, // Return the full role object
                roleId: user.roleId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }))
        }),

    /**
     * Get user by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            const user = await prisma.user.findUnique({
                where: { id: input.id },
                include: { role: true },
            })
            if (!user) throw new Error('User not found')
            return {
                id: user.id,
                username: user.username,
                name: user.name,
                code: user.code,
                mobile: user.mobile,
                isActive: user.isActive,
                address: user.address,
                role: user.role.name,
                roleId: user.roleId,
            }
        }),

    /**
     * Create new user (admin only)
     */
    create: adminProcedure
        .input(z.object({
            username: z.string().min(3),
            password: z.string().min(4),
            name: z.string().optional(),
            code: z.string().optional(),
            mobile: z.string().optional(),
            address: z.string().optional(),
            roleId: z.number(),
        }))
        .mutation(async ({ input }) => {
            const passwordHash = await authService.hashPassword(input.password)
            const user = await prisma.user.create({
                data: {
                    username: input.username,
                    passwordHash,
                    name: input.name,
                    code: input.code,
                    mobile: input.mobile,
                    address: input.address,
                    roleId: input.roleId,
                },
                include: { role: true },
            })
            return {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role.name,
            }
        }),

    /**
     * Update user (admin only)
     */
    update: adminProcedure
        .input(z.object({
            id: z.number(),
            username: z.string().min(3).optional(),
            password: z.string().min(4).optional(),
            name: z.string().optional(),
            code: z.string().optional(),
            mobile: z.string().optional(),
            address: z.string().optional(),
            roleId: z.number().optional(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, password, ...data } = input

            // Prevent deactivating admin user
            if (id === 1 && data.isActive === false) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot deactivate the admin user'
                })
            }

            const updateData: Record<string, unknown> = { ...data }

            if (password) {
                updateData.passwordHash = await authService.hashPassword(password)
            }

            const user = await prisma.user.update({
                where: { id },
                data: updateData,
                include: { role: true },
            })
            return {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role.name,
            }
        }),

    /**
     * Delete user (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            if (input.id === 1) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot delete the admin user'
                })
            }

            // Check for references
            const user = await prisma.user.findUnique({
                where: { id: input.id },
                include: {
                    _count: {
                        select: {
                            dutySessions: true,
                            verifiedSessions: true,
                            initiatedEditRequests: true,
                            approvedEditRequests: true,
                        }
                    }
                }
            })

            if (!user) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found'
                })
            }

            const refCount = user._count.dutySessions +
                user._count.verifiedSessions +
                user._count.initiatedEditRequests +
                user._count.approvedEditRequests

            if (refCount > 0) {
                throw new TRPCError({
                    code: 'PRECONDITION_FAILED',
                    message: 'Cannot delete this employee because they have recorded shift history or requests. Try deactivating them instead.'
                })
            }

            await prisma.user.delete({
                where: { id: input.id }
            })

            return { success: true }
        }),

    /**
     * Get all roles
     */
    getRoles: adminProcedure.query(async () => {
        return prisma.userRole.findMany()
    }),
})
