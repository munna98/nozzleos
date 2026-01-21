import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'

export interface Context {
    user: {
        id: number
        username: string
        role: string
    } | null
}

const t = initTRPC.context<Context>().create({
    transformer: superjson,
    errorFormatter({ shape, error }) {
        return {
            ...shape,
            data: {
                ...shape.data,
                zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
            },
        }
    },
})

export const router = t.router
export const middleware = t.middleware
export const createCallerFactory = t.createCallerFactory

/**
 * Public procedure - no authentication required
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
    if (!ctx.user) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'You must be logged in to access this resource',
        })
    }
    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    })
})

/**
 * Admin procedure - requires admin or manager role
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
    const allowedRoles = ['Admin', 'Manager']
    if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
        })
    }
    return next({ ctx })
})

/**
 * Attendant procedure - for shift operations
 */
export const attendantProcedure = protectedProcedure
