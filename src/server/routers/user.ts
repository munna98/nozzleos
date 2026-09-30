import { z } from 'zod'
import { router, adminProcedure, tenantProcedure, TRPCError } from '../trpc/init'
import { authService } from '../services/auth.service'
import prisma from '@/lib/prisma'

export const userRouter = router({
    /**
     * Get all users for the current station (admin only)
     * Note: Super Admin users are hidden from station-level queries
     */
    getAll: adminProcedure
        .input(z.object({
            role: z.string().optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
            const where: Record<string, unknown> = {
                stationId: ctx.stationId,
                deletedAt: null,
                // Hide Super Admin users from station-level queries
                role: {
                    name: { not: 'Super Admin' }
                }
            }

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
                role: user.role,
                roleId: user.roleId,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            }))
        }),

    /**
     * Get user by ID (tenant-scoped)
     */
    getById: tenantProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
            const user = await prisma.user.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
                include: { role: true },
            })
            if (!user) throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'User not found'
            })
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
        .mutation(async ({ ctx, input }) => {
            // Prevent creating Super Admin users from station-level
            const role = await prisma.userRole.findUnique({
                where: { id: input.roleId }
            })
            if (role?.name === 'Super Admin') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot create Super Admin users from station admin'
                })
            }

            // Check for duplicate username within the station
            const existingUser = await prisma.user.findFirst({
                where: {
                    stationId: ctx.stationId,
                    username: input.username,
                    deletedAt: null
                }
            })
            if (existingUser) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Username "${input.username}" is already taken`
                })
            }

            const passwordHash = await authService.hashPassword(input.password)
            const user = await prisma.user.create({
                data: {
                    stationId: ctx.stationId,
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
        .mutation(async ({ ctx, input }) => {
            const { id, password, ...data } = input

            // Verify user belongs to this station
            const existingUser = await prisma.user.findFirst({
                where: { id, stationId: ctx.stationId },
                include: { role: true }
            })
            if (!existingUser) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'User not found'
                })
            }

            // Prevent modifying Super Admin users from station-level
            if (existingUser.role.name === 'Super Admin') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot modify Super Admin users'
                })
            }

            // Prevent deactivating station admin user (first Admin of the station)
            const stationAdmins = await prisma.user.findMany({
                where: {
                    stationId: ctx.stationId,
                    role: { name: 'Admin' },
                    deletedAt: null
                },
                orderBy: { id: 'asc' }
            })
            if (stationAdmins.length === 1 && stationAdmins[0].id === id && data.isActive === false) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot deactivate the only admin user for this station'
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
        .mutation(async ({ ctx, input }) => {
            // Verify user belongs to this station
            const user = await prisma.user.findFirst({
                where: {
                    id: input.id,
                    stationId: ctx.stationId
                },
                include: {
                    role: true,
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

            // Prevent deleting Super Admin users
            if (user.role.name === 'Super Admin') {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot delete Super Admin users'
                })
            }

            // Check if this is the only admin
            const stationAdmins = await prisma.user.findMany({
                where: {
                    stationId: ctx.stationId,
                    role: { name: 'Admin' },
                    deletedAt: null
                }
            })
            if (stationAdmins.length === 1 && stationAdmins[0].id === input.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Cannot delete the only admin user for this station'
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
     * Get all roles (excluding Super Admin for station-level users)
     */
    getRoles: adminProcedure.query(async () => {
        return prisma.userRole.findMany({
            where: {
                // Hide Super Admin role from station-level dropdowns
                name: { not: 'Super Admin' }
            }
        })
    }),
})
