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

const studentAxios: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

studentAxios.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("studentAccessToken");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.headers) {
      config.headers["X-Request-ID"] = crypto.randomUUID();
    }

    return config;
  },
  (error: AxiosError) => {
    console.error("Student request error:", error);
    return Promise.reject(error);
  },
);

studentAxios.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError<ApiError>) => {
    const errorData = error.response?.data;

    if (error.response?.status === 401) {
      // Keep session until manual logout; just notify user
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
  },
);

export default studentAxios;

export const studentApiCall = async <T>(
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
      // Error already shown in interceptor
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
