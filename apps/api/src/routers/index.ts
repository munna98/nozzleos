import { router } from '@nozzleos/trpc'
import { authRouter } from './auth.js'
import { userRouter } from './user.js'
import { customerRouter } from './customer.js'
import { fuelRouter } from './fuel.js'
import { dispenserRouter } from './dispenser.js'
import { nozzleRouter } from './nozzle.js'
import { paymentMethodRouter } from './payment-method.js'
import { shiftRouter } from './shift.js'

/**
 * Main application router
 * All sub-routers are merged here
 */
export const appRouter = router({
    auth: authRouter,
    user: userRouter,
    customer: customerRouter,
    fuel: fuelRouter,
    dispenser: dispenserRouter,
    nozzle: nozzleRouter,
    paymentMethod: paymentMethodRouter,
    shift: shiftRouter,
})

/**
 * Export type for use in frontend
 */
export type AppRouter = typeof appRouter
