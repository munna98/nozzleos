/**
 * tRPC Hooks for NozzleOS
 * 
 * This file demonstrates how to use tRPC hooks in your components.
 * You can replace the existing axios-based services with these hooks.
 */

import { trpc } from './trpc'

// ============ Customer Hooks ============
export function useCustomers() {
    return trpc.customer.getAll.useQuery()
}

export function useCreateCustomer() {
    const utils = trpc.useUtils()
    return trpc.customer.create.useMutation({
        onSuccess: () => {
            utils.customer.getAll.invalidate()
        },
    })
}

export function useUpdateCustomer() {
    const utils = trpc.useUtils()
    return trpc.customer.update.useMutation({
        onSuccess: () => {
            utils.customer.getAll.invalidate()
        },
    })
}

export function useDeleteCustomer() {
    const utils = trpc.useUtils()
    return trpc.customer.delete.useMutation({
        onSuccess: () => {
            utils.customer.getAll.invalidate()
        },
    })
}

// ============ Fuel Hooks ============
export function useFuels() {
    return trpc.fuel.getAll.useQuery()
}

export function useCreateFuel() {
    const utils = trpc.useUtils()
    return trpc.fuel.create.useMutation({
        onSuccess: () => {
            utils.fuel.getAll.invalidate()
        },
    })
}

// ============ Dispenser Hooks ============
export function useDispensers() {
    return trpc.dispenser.getAll.useQuery()
}

// ============ Nozzle Hooks ============
export function useNozzles() {
    return trpc.nozzle.getAll.useQuery()
}

// ============ Payment Method Hooks ============
export function usePaymentMethods() {
    return trpc.paymentMethod.getAll.useQuery()
}

// ============ User Hooks ============
export function useUsers() {
    return trpc.user.getAll.useQuery()
}

export function useRoles() {
    return trpc.user.getRoles.useQuery()
}

// ============ Shift Hooks ============
export function useActiveShift() {
    return trpc.shift.getActive.useQuery()
}

export function useStartShift() {
    const utils = trpc.useUtils()
    return trpc.shift.start.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.nozzle.getAll.invalidate()
        },
    })
}

export function useAddPayment() {
    const utils = trpc.useUtils()
    return trpc.shift.addPayment.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
        },
    })
}

export function useCompleteShift() {
    const utils = trpc.useUtils()
    return trpc.shift.complete.useMutation({
        onSuccess: () => {
            utils.shift.getActive.invalidate()
            utils.nozzle.getAll.invalidate()
        },
    })
}

// ============ Auth Hooks ============
export function useLogin() {
    return trpc.auth.login.useMutation()
}

export function useLogout() {
    return trpc.auth.logout.useMutation()
}

export function useCurrentUser() {
    return trpc.auth.me.useQuery()
}
