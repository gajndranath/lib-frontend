import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import type { ApiError } from "@/types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    if (config.headers) {
      config.headers["X-Request-ID"] = crypto.randomUUID();
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error: AxiosError<ApiError>) => {
    const errorData = error.response?.data;

    // Handle specific error codes
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem("accessToken");
      localStorage.removeItem("admin");

      // Redirect to login if not already there
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }

      toast.error("Session expired. Please login again.");
    } else if (error.response?.status === 403) {
      toast.error("Access denied. You do not have permission.");
    } else if (error.response?.status === 429) {
      toast.error("Too many requests. Please try again later.");
    } else if (errorData?.message) {
      toast.error(errorData.message);
    } else {
      toast.error("An error occurred. Please try again.");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

// Helper function for API calls with error handling
export const apiCall = async <T>(
  promise: Promise<T>,
  options?: {
    showSuccess?: boolean;
    successMessage?: string;
    showError?: boolean;
  }
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
