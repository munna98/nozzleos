import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Auth state store - persisted to localStorage
 */
interface AuthState {
    accessToken: string | null
    refreshToken: string | null
    user: {
        id: number
        username: string
        name: string | null
        role: string
    } | null

    // Actions
    setAuth: (data: {
        accessToken: string
        refreshToken?: string
        user: AuthState['user']
    }) => void
    clearAuth: () => void
    isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            accessToken: null,
            refreshToken: null,
            user: null,

            setAuth: (data) => {
                set({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken ?? null,
                    user: data.user,
                })
                // Also store in localStorage for tRPC client compatibility
                localStorage.setItem('auth', JSON.stringify({
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                }))
            },

            clearAuth: () => {
                set({
                    accessToken: null,
                    refreshToken: null,
                    user: null,
                })
                localStorage.removeItem('auth')
            },

            isAuthenticated: () => {
                return get().accessToken !== null && get().user !== null
            },
        }),
        {
            name: 'nozzleos-auth',
        }
    )
)

/**
 * UI state store - non-persisted
 */
interface UIState {
    sidebarOpen: boolean
    currentShiftStep: number
    selectedNozzleIds: number[]

    // Actions
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
    setShiftStep: (step: number) => void
    selectNozzle: (id: number) => void
    deselectNozzle: (id: number) => void
    clearNozzleSelection: () => void
    setSelectedNozzles: (ids: number[]) => void
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: true,
    currentShiftStep: 1,
    selectedNozzleIds: [],

    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    setShiftStep: (step) => set({ currentShiftStep: step }),

    selectNozzle: (id) =>
        set((state) => ({
            selectedNozzleIds: state.selectedNozzleIds.includes(id)
                ? state.selectedNozzleIds
                : [...state.selectedNozzleIds, id],
        })),

    deselectNozzle: (id) =>
        set((state) => ({
            selectedNozzleIds: state.selectedNozzleIds.filter((i) => i !== id),
        })),

    clearNozzleSelection: () => set({ selectedNozzleIds: [] }),

    setSelectedNozzles: (ids) => set({ selectedNozzleIds: ids }),
}))
