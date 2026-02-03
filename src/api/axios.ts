import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import type { ApiError } from "@/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://lib-backend-j0e9.onrender.com/api/v1";

// Request deduplication cache - prevents duplicate concurrent requests
const requestCache = new Map<string, Promise<unknown>>();

// Create axios instance with performance headers
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor with deduplication
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");

    // Add authorization header if token exists
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    if (config.headers) {
      config.headers["X-Request-ID"] = crypto.randomUUID();
    }

    // Deduplicate GET requests - prevent duplicate in-flight requests
    if (config.method?.toUpperCase() === "GET") {
      const cacheKey = `${config.url}?${JSON.stringify(config.params || {})}`;
      if (requestCache.has(cacheKey)) {
        // Return cached promise instead of making new request
        return Promise.reject(new Error("DUPLICATE_REQUEST"));
      }
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Clear cache for this request on success
    if (response.config.method?.toUpperCase() === "GET") {
      const cacheKey = `${response.config.url}?${JSON.stringify(
        response.config.params || {},
      )}`;
      requestCache.delete(cacheKey);
    }
    return response.data;
  },
  (error: AxiosError<ApiError>) => {
    const errorData = error.response?.data;

    // Handle specific error codes
    if (error.response?.status === 401) {
      // Keep session until manual logout; just notify user
      toast.error("Session expired. Please login again.");
    } else if (error.response?.status === 403) {
      toast.error("Access denied. You do not have permission.");
    } else if (error.response?.status === 429) {
      toast.error("Too many requests. Please try again later.");
    } else if (error.response?.status === 400) {
      // Show validation errors
      toast.error(errorData?.message || "Invalid request");
    } else if (error.response?.status === 500) {
      // Don't expose server details
      toast.error("An error occurred. Please try again later.");
    } else if (errorData?.message) {
      toast.error(errorData.message);
    } else if (!error.response) {
      toast.error("Network error. Please check your connection.");
    } else {
      toast.error("An error occurred. Please try again.");
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;

// Helper function for API calls with error handling
export const apiCall = async <T>(
  promise: Promise<T>,
  options?: {
    showSuccess?: boolean;
    successMessage?: string;
    showError?: boolean;
  },
): Promise<{ data: T | null; error: ApiError | null }> => {
  try {
    const data = await promise;
    if (options?.showSuccess && options?.successMessage) {
      toast.success(options.successMessage);
    }
    return { data, error: null };
  } catch (error) {
    const apiError = error as AxiosError<ApiError>;

    if (options?.showError !== false) {
      // Error is already shown in interceptor
    }

    return {
      data: null,
      error: apiError.response?.data || {
        success: false,
        statusCode: apiError.response?.status || 500,
        message: apiError.message || "Network error",
      },
    };
  }
};
