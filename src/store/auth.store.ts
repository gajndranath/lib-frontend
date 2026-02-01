import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Admin } from "@/types";

interface AuthState {
  admin: Admin | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthActions {
  setAuth: (admin: Admin, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  updateAdmin: (admin: Partial<Admin>) => void;
}

const initialState: AuthState = {
  admin: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setAuth: (admin, accessToken) =>
        set({
          admin,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      clearAuth: () =>
        set({
          admin: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      updateAdmin: (adminData) =>
        set((state) => ({
          admin: state.admin ? { ...state.admin, ...adminData } : null,
        })),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
      }),
      onRehydrateStorage: () => {
        console.log("Auth store rehydrated from storage");
        return (_state, error) => {
          if (error) {
            console.error("Error rehydrating auth store:", error);
          } else {
            console.log("Auth store rehydrated successfully");
          }
        };
      },
    }
  )
);

// Selectors
export const selectAdmin = (state: AuthState & AuthActions) => state.admin;
export const selectIsAuthenticated = (state: AuthState & AuthActions) =>
  state.isAuthenticated;
export const selectIsSuperAdmin = (state: AuthState & AuthActions) =>
  state.admin?.role === "SUPER_ADMIN";
export const selectIsLoading = (state: AuthState & AuthActions) =>
  state.isLoading;
