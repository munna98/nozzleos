import { z } from 'zod'
import { router, superAdminProcedure, publicProcedure, TRPCError } from '../trpc/init'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'

export const stationRouter = router({
    /**
     * Get public station info by slug (Public)
     */
    getPublicInfo: publicProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input }) => {
            const station = await prisma.station.findUnique({
                where: { slug: input.slug },
                select: { name: true, location: true }
            })

            if (!station) return null
            return station
        }),
    /**
     * Get all stations (Super Admin only)
     */
    getAll: superAdminProcedure
        .input(z.object({
            includeInactive: z.boolean().optional().default(false),
        }).optional())
        .query(async ({ input }) => {
            const where = input?.includeInactive ? {} : { isActive: true }

            const stations = await prisma.station.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            users: true,
                            customers: true,
                            fuels: true,
                            dispensers: true,
                            nozzles: true,
                            dutySessions: true,
                        }
                    }
                },
                orderBy: { name: 'asc' },
            })

            return stations
        }),

    /**
     * Get station by ID (Super Admin only)
     */
    getById: superAdminProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            const station = await prisma.station.findUnique({
                where: { id: input.id },
                include: {
                    _count: {
                        select: {
                            users: true,
                            customers: true,
                            fuels: true,
                            dispensers: true,
                            nozzles: true,
                            dutySessions: true,
                        }
                    },
                    settings: true,
                }
            })

            if (!station) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Station not found'
                })
            }

            return station
        }),

    /**
     * Get station by slug (Super Admin only)
     */
    getBySlug: superAdminProcedure
        .input(z.object({ slug: z.string() }))
        .query(async ({ input }) => {
            const station = await prisma.station.findUnique({
                where: { slug: input.slug },
            })

            if (!station) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Station not found'
                })
            }

            return station
        }),

    /**
     * Create new station (Super Admin only)
     */
    create: superAdminProcedure
        .input(z.object({
            slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/,
                'Slug must be lowercase with only letters, numbers, and hyphens'),
            name: z.string().min(2).max(100),
            location: z.string().optional(),
            mobile: z.string().optional(),
            email: z.string().email().optional(),
        }))
        .mutation(async ({ input }) => {
            // Check if slug is already taken
            const existing = await prisma.station.findUnique({
                where: { slug: input.slug }
            })

            if (existing) {
                throw new TRPCError({
                    code: 'CONFLICT',
                    message: `Station with slug "${input.slug}" already exists`
                })
            }

            // Find Admin role for the new user
            const adminRole = await prisma.userRole.findUnique({
                where: { name: 'Admin' }
            })

            if (!adminRole) {
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Default 'Admin' role not found. Please run seed script."
                })
            }

            // Hash the slug to use as password
            const passwordHash = await hash(input.slug, 12)

            // Create station with default settings and Cash payment method
            const station = await prisma.$transaction(async (tx) => {
                // Create the station
                const newStation = await tx.station.create({
                    data: {
                        slug: input.slug,
                        name: input.name,
                        location: input.location,
                        mobile: input.mobile,
                        email: input.email,
                    }
                })

                // Create default settings for the station
                await tx.settings.create({
                    data: {
                        stationId: newStation.id,
                    }
                })

                // Create default Cash payment method
                await tx.paymentMethod.create({
                    data: {
                        stationId: newStation.id,
                        name: 'Cash',
                        isActive: true,
                    }
                })

                // Create Admin user for the station
                await tx.user.create({
                    data: {
                        stationId: newStation.id,
                        username: input.slug, // Username same as slug
                        name: 'Admin',
                        passwordHash,         // Password same as slug (hashed)
                        roleId: adminRole.id,
                        isActive: true,
                    }
                })

                return newStation
            })

            return station
        }),

    /**
     * Update station (Super Admin only)
     */
    update: superAdminProcedure
        .input(z.object({
            id: z.number(),
            slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/,
                'Slug must be lowercase with only letters, numbers, and hyphens').optional(),
            name: z.string().min(2).max(100).optional(),
            location: z.string().optional().nullable(),
            mobile: z.string().optional().nullable(),
            email: z.string().email().optional().nullable(),
            isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const { id, ...data } = input

            // Check if station exists
            const existing = await prisma.station.findUnique({
                where: { id }
            })

            if (!existing) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Station not found'
                })
            }

            // If changing slug, check uniqueness
            if (data.slug && data.slug !== existing.slug) {
                const slugExists = await prisma.station.findUnique({
                    where: { slug: data.slug }
                })

                if (slugExists) {
                    throw new TRPCError({
                        code: 'CONFLICT',
                        message: `Station with slug "${data.slug}" already exists`
                    })
                }
            }

            return prisma.station.update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date(),
                }
            })
        }),

    /**
     * Delete station (Super Admin only) - Soft delete by deactivating
     * Note: We don't hard delete stations to preserve data integrity
     */
    delete: superAdminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const station = await prisma.station.findUnique({
                where: { id: input.id },
                include: {
                    _count: {
                        select: { dutySessions: true }
                    }
                }
            })

            if (!station) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Station not found'
                })
            }

            // Only allow deletion if no duty sessions exist
            if (station._count.dutySessions > 0) {
                // Soft delete - just deactivate
                await prisma.station.update({
                    where: { id: input.id },
                    data: { isActive: false }
                })

                return {
                    success: true,
                    message: 'Station has been deactivated (has historical data)'
                }
            }

            // Hard delete if no duty sessions
            await prisma.station.delete({
                where: { id: input.id }
            })

            return { success: true, message: 'Station deleted' }
        }),

    /**
     * Get station stats for dashboard (Super Admin only)
     */
    getStats: superAdminProcedure.query(async () => {
        const [
            totalStations,
            activeStations,
            totalUsers,
            totalShifts,
            recentShifts
        ] = await Promise.all([
            prisma.station.count(),
            prisma.station.count({ where: { isActive: true } }),
            prisma.user.count({ where: { deletedAt: null, role: { name: { not: 'Super Admin' } } } }),
            prisma.dutySession.count(),
            prisma.dutySession.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
            })
        ])

        return {
            totalStations,
            activeStations,
            inactiveStations: totalStations - activeStations,
            totalUsers,
            totalShifts,
            recentShifts,
        }
    }),
})
