import { z } from 'zod'
import { fuelSchema } from './fuel.js'

// ============ Nozzle ============
export const nozzleSchema = z.object({
    id: z.number(),
    code: z.string(),
    dispenserId: z.number(),
    fuelId: z.number(),
    fuel: fuelSchema.optional(),
    price: z.number(),
    currentreading: z.number(),
    isActive: z.boolean().default(true),
    isAvailable: z.boolean().default(true),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

export const createNozzleSchema = z.object({
    code: z.string().min(1, 'Nozzle code is required'),
    dispenserId: z.number(),
    fuelId: z.number(),
    price: z.number().min(0, 'Price must be non-negative'),
    currentreading: z.number().min(0).default(0),
    isActive: z.boolean().optional().default(true),
})

export const updateNozzleSchema = createNozzleSchema.partial()

export const setNozzleAvailabilitySchema = z.object({
    isAvailable: z.boolean(),
})

export type Nozzle = z.infer<typeof nozzleSchema>
export type CreateNozzle = z.infer<typeof createNozzleSchema>
export type UpdateNozzle = z.infer<typeof updateNozzleSchema>
export type SetNozzleAvailability = z.infer<typeof setNozzleAvailabilitySchema>
