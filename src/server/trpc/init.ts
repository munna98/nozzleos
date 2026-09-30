import { initTRPC, TRPCError } from '@trpc/server'
export { TRPCError };
import superjson from 'superjson'
import { ZodError } from 'zod'

// ==================== CONTEXT INTERFACE ====================

export interface Context {
    user: {
        id: number
        username: string
        role: string
        stationId: number | null  // Null for Super Admins
    } | null
    stationId: number | null      // Current station context (from subdomain/query param)
    isSuperAdmin: boolean         // Quick check for Super Admin status
}

// Type for authenticated context
export interface AuthenticatedContext extends Context {
    user: NonNullable<Context['user']>
}

// Type for tenant context (requires valid stationId)
export interface TenantContext extends AuthenticatedContext {
    stationId: number
}

// Type for super admin context
export interface SuperAdminContext extends AuthenticatedContext {
    isSuperAdmin: true
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

// ==================== PROCEDURES ====================

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
        } as AuthenticatedContext,
    })
})

/**
 * Tenant procedure - requires authentication AND valid stationId
 * Use this for all station-specific operations
 */
export const tenantProcedure = protectedProcedure.use(({ ctx, next }) => {
    // Super admins can access any station if they provide a stationId
    if (ctx.isSuperAdmin) {
        // Super admin must specify a station to work with for tenant operations
        if (ctx.stationId === null) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Super Admin must select a station to perform this operation',
            })
        }
        return next({
            ctx: {
                ...ctx,
                stationId: ctx.stationId,
            } as TenantContext,
        })
    }

    // Regular users must have a stationId from their user record
    const stationId = ctx.user.stationId
    if (stationId === null) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You are not assigned to any station',
        })
    }

    return next({
        ctx: {
            ...ctx,
            stationId,
        } as TenantContext,
    })
})

/**
 * Admin procedure - requires admin or manager role within the tenant
 */
export const adminProcedure = tenantProcedure.use(({ ctx, next }) => {
    const allowedRoles = ['Admin', 'Manager', 'Super Admin']
    if (!allowedRoles.includes(ctx.user.role)) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
        })
    }
    return next({ ctx })
})

/**
 * Super Admin procedure - bypasses tenant restrictions
 * Use this for global operations like managing stations
 */
export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
    if (ctx.user.role !== 'Super Admin') {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only Super Admins can access this resource',
        })
    }
    return next({
        ctx: {
            ...ctx,
            isSuperAdmin: true,
        } as SuperAdminContext,
    })
})

/**
 * Attendant procedure - for shift operations (requires tenant context)
 */
export const attendantProcedure = tenantProcedure
