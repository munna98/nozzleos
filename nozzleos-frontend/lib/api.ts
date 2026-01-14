import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface UserRole {
    id: number;
    name: string;
}

export interface User {
    id: number;
    username: string;
    name?: string;
    code?: string;
    mobile?: string;
    address?: string;
    isActive: boolean;
    roleId: number;
    role?: UserRole;
    createdAt: string;
    updatedAt: string;
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
    email: string;
    phone?: string;
    isActive: boolean;
    paymentMethod?: PaymentMethod | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateCustomerDto {
    name: string;
    email: string;
    phone?: string;
    createPaymentMethod?: boolean;
}

export interface UpdateCustomerDto {
    name?: string;
    email?: string;
    phone?: string;
    isActive?: boolean;
    createPaymentMethod?: boolean;
}

export const UserService = {
    getAll: async () => {
        const response = await api.get<User[]>('/users');
        return response.data;
    },

    create: async (data: CreateUserDto) => {
        const response = await api.post<User>('/users', data);
        return response.data;
    },

    update: async (id: number, data: UpdateUserDto) => {
        const response = await api.put<User>(`/users/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete<User>(`/users/${id}`);
        return response.data;
    },

    getRoles: async () => {
        const response = await api.get<UserRole[]>('/users/roles');
        return response.data;
    }
};

export const CustomerService = {
    getAll: async () => {
        const response = await api.get<Customer[]>('/customers');
        return response.data;
    },

    create: async (data: CreateCustomerDto) => {
        const response = await api.post<Customer>('/customers', data);
        return response.data;
    },

    update: async (id: number, data: UpdateCustomerDto) => {
        const response = await api.put<Customer>(`/customers/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete<Customer>(`/customers/${id}`);
        return response.data;
    }
};

export interface PaymentMethod {
    id: number;
    name: string;
    isActive: boolean;
    customerId?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentMethodDto {
    name: string;
    isActive?: boolean;
}

export const PaymentMethodService = {
    getAll: async () => {
        const response = await api.get<PaymentMethod[]>('/payment-methods');
        return response.data;
    },

    create: async (data: PaymentMethodDto) => {
        const response = await api.post<PaymentMethod>('/payment-methods', data);
        return response.data;
    },

    update: async (id: number, data: PaymentMethodDto) => {
        const response = await api.put<PaymentMethod>(`/payment-methods/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await api.delete<PaymentMethod>(`/payment-methods/${id}`);
        return response.data;
    }
};

export default api;
