import { router, protectedProcedure, attendantProcedure, adminProcedure } from '@nozzleos/trpc'
import {
    startShiftSchema,
    addPaymentSchema,
    updateNozzleReadingSchema,
    completeShiftSchema,
} from '@nozzleos/validators'
import { z } from 'zod'
import { shiftService } from '../services/index.js'

export const shiftRouter = router({
    /**
     * Generate a shift name
     */
    generateShiftName: attendantProcedure.query(() => {
        return { shiftName: shiftService.generateShiftName() }
    }),

    /**
     * Get all shifts with pagination
     */
    getAll: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(10),
            offset: z.number().min(0).default(0),
            status: z.enum(['in_progress', 'completed', 'archived']).optional(),
        }))
        .query(async ({ input, ctx }) => {
            return shiftService.getAllShifts({
                limit: input.limit,
                offset: input.offset,
                status: input.status,
                userId: ctx.user.id,
                isAdmin: ctx.user.role === 'Admin',
            })
        }),

    /**
     * Get active shift for current user
     */
    getActive: attendantProcedure.query(async ({ ctx }) => {
        return shiftService.getUserActiveShift(ctx.user.id)
    }),

    /**
     * Start a new shift
     */
    start: attendantProcedure
        .input(startShiftSchema)
        .mutation(async ({ input, ctx }) => {
            return shiftService.startShift(ctx.user.id, input.shiftName, input.nozzleIds)
        }),

    /**
     * Add a payment to the shift
     */
    addPayment: attendantProcedure
        .input(z.object({ shiftId: z.number(), data: addPaymentSchema }))
        .mutation(async ({ input, ctx }) => {
            return shiftService.addOrUpdatePayment(input.shiftId, ctx.user.id, {
                paymentMethodId: input.data.paymentMethodId,
                amount: input.data.amount,
                quantity: input.data.quantity,
            })
        }),

    /**
     * Delete a payment from the shift
     */
    deletePayment: attendantProcedure
        .input(z.object({ shiftId: z.number(), paymentId: z.number() }))
        .mutation(async ({ input, ctx }) => {
            return shiftService.deletePayment(input.shiftId, ctx.user.id, input.paymentId)
        }),

    /**
     * Update nozzle reading
     */
    updateNozzleReading: attendantProcedure
        .input(z.object({ shiftId: z.number(), data: updateNozzleReadingSchema }))
        .mutation(async ({ input, ctx }) => {
            return shiftService.updateNozzleReading(input.shiftId, ctx.user.id, {
                nozzleReadingId: input.data.nozzleReadingId,
                testQty: input.data.testQty,
                closingReading: input.data.closingReading,
            })
        }),

    /**
     * Update a payment in the shift
     */
    updatePayment: attendantProcedure
        .input(z.object({ shiftId: z.number(), paymentId: z.number(), data: addPaymentSchema }))
        .mutation(async ({ input, ctx }) => {
            return shiftService.addOrUpdatePayment(input.shiftId, ctx.user.id, {
                paymentId: input.paymentId,
                paymentMethodId: input.data.paymentMethodId,
                amount: input.data.amount,
                quantity: input.data.quantity,
            })
        }),

    /**
     * Get shift summary/preview
     */
    getSummary: attendantProcedure
        .input(z.object({ shiftId: z.number() }))
        .query(async ({ input, ctx }) => {
            return shiftService.getSummary(input.shiftId, ctx.user.id, ctx.user.role === 'Admin')
        }),

    /**
     * Complete the shift
     */
    complete: attendantProcedure
        .input(z.object({ shiftId: z.number(), data: completeShiftSchema }))
        .mutation(async ({ input, ctx }) => {
            return shiftService.completeShift(input.shiftId, ctx.user.id, input.data.notes)
        }),
})
