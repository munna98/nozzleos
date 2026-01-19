import { z } from 'zod'

// ============ Payment Method ============
export const paymentMethodSchema = z.object({
    id: z.number(),
    name: z.string(),
    isActive: z.boolean().default(true),
    customerId: z.number().nullable().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

export const createPaymentMethodSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    isActive: z.boolean().optional().default(true),
})

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial()

export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type CreatePaymentMethod = z.infer<typeof createPaymentMethodSchema>
export type UpdatePaymentMethod = z.infer<typeof updatePaymentMethodSchema>

// ============ Customer ============
export const customerSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
    paymentMethod: paymentMethodSchema.nullable().optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
})

export const createCustomerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().optional(),
    createPaymentMethod: z.boolean().optional().default(true),
})

export const updateCustomerSchema = createCustomerSchema.partial().extend({
    isActive: z.boolean().optional(),
})

export type Customer = z.infer<typeof customerSchema>
export type CreateCustomer = z.infer<typeof createCustomerSchema>
export type UpdateCustomer = z.infer<typeof updateCustomerSchema>
