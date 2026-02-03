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
  isLoading: true,
};

// Function to securely clear sensitive data
const clearSensitiveData = () => {
  try {
    localStorage.removeItem("auth-storage");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("admin");
    // Clear any other auth-related items
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.includes("auth") || key.includes("token")) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Error clearing sensitive data:", error);
  }
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

      clearAuth: () => {
        clearSensitiveData();
        set({
          admin: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

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
        isAuthenticated: state.isAuthenticated,
      }),
      // Validate data integrity before hydration
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("Error rehydrating auth store:", error);
            clearSensitiveData();
          } else if (state) {
            // Validate that both token and admin exist
            if (
              (state.accessToken && !state.admin) ||
              (!state.accessToken && state.admin)
            ) {
              console.warn(
                "Auth data integrity check failed - clearing storage",
              );
              clearSensitiveData();
              state.accessToken = null;
              state.admin = null;
              state.isAuthenticated = false;
            } else if (state.accessToken && state.admin) {
              // Set authenticated to true if both exist
              state.isAuthenticated = true;
              state.isLoading = false;
            } else {
              // No auth data
              state.isAuthenticated = false;
              state.isLoading = false;
            }
          }
        };
      },
    },
  ),
);

// Selectors
export const selectAdmin = (state: AuthState & AuthActions) => state.admin;
export const selectIsAuthenticated = (state: AuthState & AuthActions) =>
  state.isAuthenticated;
export const selectIsSuperAdmin = (state: AuthState & AuthActions) =>
  state.admin?.role === "SUPER_ADMIN";
export const selectIsLoading = (state: AuthState & AuthActions) =>
  state.isLoading;
