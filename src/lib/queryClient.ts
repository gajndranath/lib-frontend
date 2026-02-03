import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - cache data for 5 min
      gcTime: 1000 * 60 * 15, // 15 minutes - keep unused data in cache
      retry: 2,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff, max 10s
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: false, // Don't auto-refetch on reconnect (socket will handle)
      refetchOnMount: "stale", // Only refetch if data is stale
      networkMode: "always",
    },
    mutations: {
      retry: 1,
      networkMode: "always",
    },
  },
});

// Add rate limiting helper
class RequestQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private processing = false;
  private readonly maxConcurrent = 5;
  private activeRequests = 0;

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrent) {
      const request = this.queue.shift();
      if (request) {
        this.activeRequests++;
        request().finally(() => {
          this.activeRequests--;
          if (this.activeRequests === 0 && this.queue.length > 0) {
            this.processQueue();
          }
        });
      }
    }

    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();

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
