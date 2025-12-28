import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Admin, UserRole } from "@/types/api.types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setTokens: (accessToken: string, refreshToken?: string) => void;
  setAdmin: (admin: Admin) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  clearError: () => void;
  initialize: () => Promise<void>;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  admin: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTokens: (accessToken, refreshToken) => {
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken);
        }

        set({
          accessToken,
          refreshToken: refreshToken || null,
          isAuthenticated: !!accessToken, // Only set to true if token exists
          error: null,
        });
      },

      setAdmin: (admin) => {
        set({
          admin,
          isAuthenticated: !!admin, // Only set to true if admin exists
          error: null,
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error, isLoading: false });
      },

      logout: () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("auth-storage");

        set(initialState);
      },

      clearError: () => {
        set({ error: null });
      },

      // New function to initialize auth state
      initialize: async () => {
        const { accessToken, admin } = get();

        // If no token or admin, set as not authenticated
        if (!accessToken || !admin) {
          set({
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        // Set as authenticated only if both token and admin exist
        set({
          isAuthenticated: true,
          isLoading: false,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        admin: state.admin,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Don't set isAuthenticated here automatically
          // Let the App component handle it
          state.isLoading = true;
        }
      },
    }
  )
);

// Derived selectors
export const useIsAuthenticated = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  return { isAuthenticated, isLoading };
};

export const useAdminRole = (): UserRole | null => {
  const admin = useAuthStore((state) => state.admin);
  return admin?.role || null;
};

export const useIsSuperAdmin = (): boolean => {
  const role = useAdminRole();
  return role === "SUPER_ADMIN";
};

export const useCurrentAdmin = () => {
  return useAuthStore((state) => state.admin);
};
