import { z } from 'zod'
import { paymentMethodSchema } from './customer.js'
import { nozzleSchema } from './nozzle.js'

// ============ Nozzle Reading ============
export const nozzleSessionReadingSchema = z.object({
    id: z.number(),
    dutySessionId: z.number(),
    nozzleId: z.number(),
    nozzle: nozzleSchema.optional(),
    openingReading: z.coerce.number(),
    testQty: z.coerce.number().default(0),
    closingReading: z.coerce.number().nullable().optional(),
    fuelDispensed: z.coerce.number().default(0),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

// ============ Session Payment ============
export const sessionPaymentSchema = z.object({
    id: z.number(),
    dutySessionId: z.number(),
    paymentMethodId: z.number(),
    paymentMethod: paymentMethodSchema.optional(),
    amount: z.coerce.number(),
    quantity: z.number().nullable().optional(),
    createdAt: z.coerce.date(),
})

// ============ Duty Session ============
export const dutySessionSchema = z.object({
    id: z.number(),
    userId: z.number(),
    shiftName: z.string(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date().nullable().optional(),
    status: z.enum(['in_progress', 'completed', 'archived']).default('in_progress'),
    totalPaymentCollected: z.coerce.number().default(0),
    notes: z.string().nullable().optional(),
    nozzleReadings: z.array(nozzleSessionReadingSchema).optional(),
    sessionPayments: z.array(sessionPaymentSchema).optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

// ============ Input Schemas ============
export const startShiftSchema = z.object({
    shiftName: z.string().min(1, 'Shift name is required'),
    nozzleIds: z.array(z.number()).min(1, 'At least one nozzle must be selected'),
})

export const addPaymentSchema = z.object({
    paymentMethodId: z.number(),
    amount: z.number().positive('Amount must be positive'),
    quantity: z.number().optional(),
})

export const updateNozzleReadingSchema = z.object({
    nozzleReadingId: z.number(),
    testQty: z.number().optional(),
    closingReading: z.number().optional(),
})

export const completeShiftSchema = z.object({
    notes: z.string().optional(),
})

export type DutySession = z.infer<typeof dutySessionSchema>
export type NozzleSessionReading = z.infer<typeof nozzleSessionReadingSchema>
export type SessionPayment = z.infer<typeof sessionPaymentSchema>
export type StartShift = z.infer<typeof startShiftSchema>
export type AddPayment = z.infer<typeof addPaymentSchema>
export type UpdateNozzleReading = z.infer<typeof updateNozzleReadingSchema>
export type CompleteShift = z.infer<typeof completeShiftSchema>
