import { z } from 'zod'

// ============ Fuel ============
export const fuelSchema = z.object({
    id: z.number(),
    name: z.string(),
    price: z.number(),
    isActive: z.boolean().default(true),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

export const createFuelSchema = z.object({
    name: z.string().min(1, 'Fuel name is required'),
    price: z.number().min(0, 'Price must be non-negative'),
    isActive: z.boolean().optional().default(true),
})

export const updateFuelSchema = createFuelSchema.partial()

export type Fuel = z.infer<typeof fuelSchema>
export type CreateFuel = z.infer<typeof createFuelSchema>
export type UpdateFuel = z.infer<typeof updateFuelSchema>
