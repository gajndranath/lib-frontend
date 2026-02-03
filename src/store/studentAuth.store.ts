import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Student } from "@/types";

interface StudentAuthState {
  student: Student | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface StudentAuthActions {
  setAuth: (student: Student, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  updateStudent: (student: Partial<Student>) => void;
}

const initialState: StudentAuthState = {
  student: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
};

// Function to securely clear sensitive data
const clearSensitiveData = () => {
  try {
    localStorage.removeItem("student-auth-storage");
    localStorage.removeItem("studentAccessToken");
    localStorage.removeItem("student");
    // Clear any other student auth items
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.includes("student") &&
        (key.includes("auth") || key.includes("token"))
      ) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Error clearing sensitive data:", error);
  }
};

export const useStudentAuthStore = create<
  StudentAuthState & StudentAuthActions
>()(
  persist(
    (set) => ({
      ...initialState,

      setAuth: (student, accessToken) =>
        set({
          student,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      clearAuth: () => {
        clearSensitiveData();
        set({
          student: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),

      updateStudent: (studentData) =>
        set((state) => ({
          student: state.student ? { ...state.student, ...studentData } : null,
        })),
    }),
    {
      name: "student-auth-storage",
      partialize: (state) => ({
        student: state.student,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      // Validate data integrity before hydration
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("Error rehydrating student auth store:", error);
            clearSensitiveData();
          } else if (state) {
            // Validate that both token and student exist
            if (
              (state.accessToken && !state.student) ||
              (!state.accessToken && state.student)
            ) {
              console.warn(
                "Student auth data integrity check failed - clearing storage",
              );
              clearSensitiveData();
              state.accessToken = null;
              state.student = null;
              state.isAuthenticated = false;
            } else if (state.accessToken && state.student) {
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
