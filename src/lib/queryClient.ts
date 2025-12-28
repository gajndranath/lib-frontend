import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
    },
  },
});

// Query keys factory for better type safety
export interface StudentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export const queryKeys = {
  auth: {
    profile: ["auth", "profile"] as const,
  },
  students: {
    all: ["students"] as const,
    lists: () => [...queryKeys.students.all, "list"] as const,
    list: (filters: StudentFilters) =>
      [...queryKeys.students.lists(), filters] as const,
    details: () => [...queryKeys.students.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
    dashboard: (month: number, year: number) =>
      [...queryKeys.students.all, "dashboard", { month, year }] as const,
    history: (id: string) =>
      [...queryKeys.students.details(), id, "history"] as const,
  },
  payments: {
    all: ["payments"] as const,
    monthly: (month: number, year: number) =>
      [...queryKeys.payments.all, month, year] as const,
    student: (studentId: string) =>
      [...queryKeys.payments.all, studentId] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    monthly: (month: number, year: number) =>
      [...queryKeys.analytics.all, "monthly", month, year] as const,
    yearly: (year: number) =>
      [...queryKeys.analytics.all, "yearly", year] as const,
    dashboard: ["analytics", "dashboard"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    preferences: ["notifications", "preferences"] as const,
  },
} as const;
