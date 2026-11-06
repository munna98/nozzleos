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

export interface Product {
    id: number;
    stationId?: number;
    code: string;
    name: string;
    unit: string;
    rate: number;
    group: string;
    isActive: boolean;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface ProductDto {
    code: string;
    name: string;
    unit: string;
    rate: number;
    group: string;
    isActive?: boolean;
}

export interface SessionProduct {
    id: number;
    dutySessionId: number;
    productId: number;
    product?: Product;
    quantity: number;
    price: number;
    amount: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

export interface CreateSessionProductDto {
    shiftId: number;
    productId: number;
    quantity: number;
    price?: number;
}

export interface ProductGroup {
    id: number;
    stationId?: number;
    name: string;
    color?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    productCount?: number;
}

export interface ProductUnit {
    id: number;
    stationId?: number;
    name: string;
    code: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
    productCount?: number;
}

export interface NozzleDto {
    code: string;
    dispenserId: number;
    fuelId: number;
    price: number;
    currentreading: number;
    isActive?: boolean;
}
