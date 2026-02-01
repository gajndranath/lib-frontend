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

      clearAuth: () =>
        set({
          student: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),

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
      }),
    },
  ),
);
