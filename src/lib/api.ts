// Shared Type Definitions
// Extracted from legacy api.ts to support migration while using tRPC

export interface UserRole {
    id: number;
    name: string;
}

export interface User {
    id: number;
    username: string;
    name: string | null;
    code: string | null;
    mobile: string | null;
    address: string | null;
    isActive: boolean;
    roleId: number;
    role?: UserRole;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface CreateUserDto {
    username: string;
    name?: string;
    password?: string;
    code?: string;
    mobile?: string;
    address?: string;
    roleId: number;
}

export interface UpdateUserDto {
    username?: string;
    name?: string;
    password?: string;
    code?: string;
    mobile?: string;
    address?: string;
    roleId?: number;
    isActive?: boolean;
}

export interface Customer {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    isActive: boolean;
    paymentMethod?: PaymentMethod | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface CreateCustomerDto {
    name: string;
    email?: string | null;
    phone?: string | null;
    createPaymentMethod?: boolean;
}

export interface UpdateCustomerDto {
    name?: string;
    email?: string | null;
    phone?: string | null;
    isActive?: boolean;
    createPaymentMethod?: boolean;
}

export interface PaymentMethod {
    id: number;
    name: string;
    isActive: boolean;
    customerId?: number | null;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface PaymentMethodDto {
    name: string;
    isActive?: boolean;
}

export interface Fuel {
    id: number;
    name: string;
    price: number;
    isActive: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface FuelDto {
    name: string;
    price: number;
    isActive?: boolean;
}

export interface Nozzle {
    id: number;
    code: string;
    dispenserId: number;
    dispenser?: Dispenser;
    fuelId: number;
    fuel?: Fuel;
    price: number;
    currentreading: number;
    isActive: boolean;
    isAvailable: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface Dispenser {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
    nozzles?: Nozzle[];
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface DispenserDto {
    code: string;
    name: string;
    isActive?: boolean;
}

export interface NozzleDto {
    code: string;
    dispenserId: number;
    fuelId: number;
    price: number;
    currentreading: number;
    isActive?: boolean;
}
