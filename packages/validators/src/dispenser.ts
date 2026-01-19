import { z } from 'zod'
import { nozzleSchema } from './nozzle.js'

// ============ Dispenser ============
export const dispenserSchema = z.object({
    id: z.number(),
    code: z.string(),
    name: z.string(),
    isActive: z.boolean().default(true),
    nozzles: z.array(nozzleSchema).optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

export const createDispenserSchema = z.object({
    code: z.string().min(1, 'Dispenser code is required'),
    name: z.string().min(1, 'Dispenser name is required'),
    isActive: z.boolean().optional().default(true),
})

export const updateDispenserSchema = createDispenserSchema.partial()

export type Dispenser = z.infer<typeof dispenserSchema>
export type CreateDispenser = z.infer<typeof createDispenserSchema>
export type UpdateDispenser = z.infer<typeof updateDispenserSchema>
