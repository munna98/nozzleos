import { router } from './init'
import { authRouter } from '../routers/auth'
import { userRouter } from '../routers/user'
import { customerRouter } from '../routers/customer'
import { fuelRouter } from '../routers/fuel'
import { dispenserRouter } from '../routers/dispenser'
import { nozzleRouter } from '../routers/nozzle'
import { paymentMethodRouter } from '../routers/payment-method'
import { shiftRouter } from '../routers/shift'

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

export type AppRouter = typeof appRouter
