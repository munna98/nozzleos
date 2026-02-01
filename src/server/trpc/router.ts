import { router } from './init'
import { authRouter } from '../routers/auth'
import { userRouter } from '../routers/user'
import { customerRouter } from '../routers/customer'
import { fuelRouter } from '../routers/fuel'
import { dispenserRouter } from '../routers/dispenser'
import { nozzleRouter } from '../routers/nozzle'
import { paymentMethodRouter } from '../routers/payment-method'
import { shiftRouter } from '../routers/shift'
import { settingsRouter } from '../routers/settings'
import { denominationRouter } from '../routers/denomination'
import { paymentRouter } from '../routers/payment'
import { staffRouter } from '../routers/staff'
import { shiftEditRequestRouter } from '../routers/shift-edit-request'

export const appRouter = router({
    auth: authRouter,
    user: userRouter,
    customer: customerRouter,
    fuel: fuelRouter,
    dispenser: dispenserRouter,
    nozzle: nozzleRouter,
    paymentMethod: paymentMethodRouter,
    payment: paymentRouter,
    shift: shiftRouter,
    settings: settingsRouter,
    denomination: denominationRouter,
    staff: staffRouter,
    shiftEditRequest: shiftEditRequestRouter,
})

export type AppRouter = typeof appRouter

