import { router, protectedProcedure, adminProcedure } from '@nozzleos/trpc'
import { prisma } from '@nozzleos/db'
import {
    createUserSchema,
    updateUserSchema,
} from '@nozzleos/validators'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

export const userRouter = router({
    /**
     * Get all roles
     */
    getRoles: protectedProcedure.query(async () => {
        return prisma.userRole.findMany()
    }),

    /**
     * Get all users (admin only)
     */
    getAll: adminProcedure.query(async () => {
        return prisma.user.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            include: { role: true },
        })
    }),

    /**
     * Get a single user by ID
     */
    getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            return prisma.user.findUnique({
                where: { id: input.id },
                include: { role: true },
            })
        }),

    /**
     * Create a new user (admin only)
     */
    create: adminProcedure
        .input(createUserSchema)
        .mutation(async ({ input }) => {
            const passwordHash = input.password
                ? await bcrypt.hash(input.password, 10)
                : await bcrypt.hash('password123', 10) // Default password

            return prisma.user.create({
                data: {
                    username: input.username,
                    name: input.name,
                    passwordHash,
                    code: input.code,
                    mobile: input.mobile,
                    address: input.address,
                    roleId: input.roleId,
                    isActive: input.isActive ?? true,
                },
                include: { role: true },
            })
        }),

    /**
     * Update a user (admin only)
     */
    update: adminProcedure
        .input(z.object({ id: z.number(), data: updateUserSchema }))
        .mutation(async ({ input }) => {
            const updateData: Record<string, unknown> = {
                username: input.data.username,
                name: input.data.name,
                code: input.data.code,
                mobile: input.data.mobile,
                address: input.data.address,
                roleId: input.data.roleId,
                isActive: input.data.isActive,
            }

            if (input.data.password) {
                updateData.passwordHash = await bcrypt.hash(input.data.password, 10)
            }

            return prisma.user.update({
                where: { id: input.id },
                data: updateData,
                include: { role: true },
            })
        }),

    /**
     * Soft delete a user (admin only)
     */
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            return prisma.user.update({
                where: { id: input.id },
                data: { deletedAt: new Date(), isActive: false },
            })
        }),
})
