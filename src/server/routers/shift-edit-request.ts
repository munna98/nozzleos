import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'

export const shiftEditRequestRouter = router({
    /**
     * Admin requests edit permission for a verified shift
     */
    request: adminProcedure
        .input(z.object({
            shiftId: z.number(),
            reason: z.string().min(5, "Reason must be at least 5 characters"),
        }))
        .mutation(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId },
            })

            if (!shift) {
                throw new Error('Shift not found')
            }

            if (shift.status !== 'verified') {
                throw new Error('Edit permission can only be requested for verified shifts')
            }

            // Check for existing pending requests
            const existingRequest = await prisma.shiftEditRequest.findFirst({
                where: {
                    dutySessionId: input.shiftId,
                    status: 'pending',
                },
            })

            if (existingRequest) {
                throw new Error('A pending edit request already exists for this shift')
            }

            return await prisma.shiftEditRequest.create({
                data: {
                    dutySessionId: input.shiftId,
                    requestedByUserId: ctx.user.id,
                    reason: input.reason,
                    status: 'pending',
                },
                include: {
                    requestedByUser: { select: { id: true, name: true, username: true } },
                }
            })
        }),

    /**
     * Owner or admin approves the edit request
     */
    approve: protectedProcedure
        .input(z.object({
            requestId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const request = await prisma.shiftEditRequest.findUnique({
                where: { id: input.requestId },
                include: { dutySession: true },
            })

            if (!request) {
                throw new Error('Edit request not found')
            }

            if (request.status !== 'pending') {
                throw new Error('Request is no longer pending')
            }

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = request.dutySession.userId === ctx.user.id

            if (!isAdmin && !isOwner) {
                throw new Error('Only the shift owner or an admin can approve this request')
            }

            // Update request status
            const updatedRequest = await prisma.shiftEditRequest.update({
                where: { id: input.requestId },
                data: {
                    status: 'approved',
                    approvedByUserId: ctx.user.id,
                    approvedAt: new Date(),
                }
            })

            // Downgrade shift to pending_verification
            await prisma.dutySession.update({
                where: { id: request.dutySessionId },
                data: {
                    status: 'pending_verification',
                }
            })

            return updatedRequest
        }),

    /**
     * Get pending requests for user's shifts
     */
    getPending: protectedProcedure
        .input(z.object({
            shiftId: z.number().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'

            const where: any = {
                status: 'pending',
            }

            if (input.shiftId) {
                where.dutySessionId = input.shiftId
            }

            // If not admin, only see requests for shifts owned by the user
            if (!isAdmin) {
                where.dutySession = {
                    userId: ctx.user.id
                }
            }

            return await prisma.shiftEditRequest.findMany({
                where,
                include: {
                    requestedByUser: { select: { id: true, name: true, username: true } },
                    dutySession: {
                        include: {
                            user: { select: { id: true, name: true, username: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })
        }),

    /**
     * View all requests (approved + pending) for a shift
     */
    getHistory: protectedProcedure
        .input(z.object({
            shiftId: z.number(),
        }))
        .query(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findUnique({
                where: { id: input.shiftId }
            })

            if (!shift) {
                throw new Error('Shift not found')
            }

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            if (!isAdmin && shift.userId !== ctx.user.id) {
                throw new Error('You do not have permission to view this history')
            }

            return await prisma.shiftEditRequest.findMany({
                where: { dutySessionId: input.shiftId },
                include: {
                    requestedByUser: { select: { id: true, name: true, username: true } },
                    approvedByUser: { select: { id: true, name: true, username: true } },
                },
                orderBy: { createdAt: 'desc' }
            })
        }),

    /**
     * Admin can cancel pending request before owner approves
     */
    cancel: adminProcedure
        .input(z.object({
            requestId: z.number(),
        }))
        .mutation(async ({ input }) => {
            const request = await prisma.shiftEditRequest.findUnique({
                where: { id: input.requestId },
            })

            if (!request) {
                throw new Error('Edit request not found')
            }

            if (request.status !== 'pending') {
                throw new Error('Only pending requests can be cancelled')
            }

            await prisma.shiftEditRequest.delete({
                where: { id: input.requestId }
            })

            return { success: true }
        }),
})
