import { z } from 'zod'
import { router, tenantProcedure, adminProcedure, TRPCError } from '../trpc/init'
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
            const shift = await prisma.dutySession.findFirst({
                where: {
                    id: input.shiftId,
                    stationId: ctx.stationId
                },
            })

            if (!shift) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })
            }

            if (shift.status !== 'verified') {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Edit permission can only be requested for verified shifts'
                })
            }

            // Check for existing pending requests
            const existingRequest = await prisma.shiftEditRequest.findFirst({
                where: {
                    dutySessionId: input.shiftId,
                    status: 'pending',
                },
            })

            if (existingRequest) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'A pending edit request already exists for this shift'
                })
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
    approve: tenantProcedure
        .input(z.object({
            requestId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const request = await prisma.shiftEditRequest.findUnique({
                where: { id: input.requestId },
                include: { dutySession: true },
            })

            if (!request) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Edit request not found' })
            }

            // Verify request is for a shift in this station
            if (request.dutySession.stationId !== ctx.stationId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Edit request not found' })
            }

            if (request.status !== 'pending') {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Request is no longer pending' })
            }

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            const isOwner = request.dutySession.userId === ctx.user.id

            if (!isAdmin && !isOwner) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'Only the shift owner or an admin can approve this request'
                })
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
    getPending: tenantProcedure
        .input(z.object({
            shiftId: z.number().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'

            const where: Record<string, unknown> = {
                status: 'pending',
                dutySession: {
                    stationId: ctx.stationId
                }
            }

            if (input.shiftId) {
                where.dutySessionId = input.shiftId
            }

            // If not admin, only see requests for shifts owned by the user
            if (!isAdmin) {
                (where.dutySession as Record<string, unknown>).userId = ctx.user.id
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
    getHistory: tenantProcedure
        .input(z.object({
            shiftId: z.number(),
        }))
        .query(async ({ ctx, input }) => {
            const shift = await prisma.dutySession.findFirst({
                where: {
                    id: input.shiftId,
                    stationId: ctx.stationId
                }
            })

            if (!shift) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Shift not found' })
            }

            const isAdmin = ctx.user.role === 'Admin' || ctx.user.role === 'Manager'
            if (!isAdmin && shift.userId !== ctx.user.id) {
                throw new TRPCError({
                    code: 'FORBIDDEN',
                    message: 'You do not have permission to view this history'
                })
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
        .mutation(async ({ ctx, input }) => {
            const request = await prisma.shiftEditRequest.findUnique({
                where: { id: input.requestId },
                include: { dutySession: true }
            })

            if (!request) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Edit request not found' })
            }

            // Verify request is for a shift in this station
            if (request.dutySession.stationId !== ctx.stationId) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Edit request not found' })
            }

            if (request.status !== 'pending') {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Only pending requests can be cancelled'
                })
            }

            await prisma.shiftEditRequest.delete({
                where: { id: input.requestId }
            })

            return { success: true }
        }),
})
