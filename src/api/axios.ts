import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosRequestConfig,
} from "axios";
import { toast } from "sonner";
import { type ApiResponse } from "@/types/api.types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

class ApiClient {
  private client: AxiosInstance;
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem("accessToken");

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for tracking
        config.headers["X-Request-ID"] = crypto.randomUUID();

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        this.retryCount = 0;
        return response;
      },
      async (error: AxiosError<ApiResponse>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          headers: Record<string, string>;
        };

        // Handle 401 - Token expired
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest.headers["X-Retry"]
        ) {
          originalRequest.headers["X-Retry"] = "true";

          try {
            // Try to refresh token
            const refreshToken = localStorage.getItem("refreshToken");
            if (refreshToken) {
              const response = await axios.post<
                ApiResponse<{ accessToken: string }>
              >(`${API_BASE_URL}/admin/refresh`, {
                refreshToken,
              });

              const { accessToken } = response.data.data;
              localStorage.setItem("accessToken", accessToken);

              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch {
            // Refresh failed, logout user
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            window.location.href = "/login";
          }
        }

        // Handle network errors with retry logic
        if (
          !error.response &&
          this.retryCount < this.maxRetries &&
          originalRequest
        ) {
          this.retryCount++;
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * this.retryCount)
          );
          return this.client(originalRequest);
        }

        // Format error response
        const errorData = error.response?.data;
        const errorMessage =
          errorData?.message || error.message || "Network Error";

        // Show toast notification for errors
        if (error.response?.status !== 401) {
          toast.error(errorMessage);
        }

        throw new Error(errorMessage);
      }
    );
  }

  // Generic HTTP methods with proper typing
  async get<T>(
    url: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.get<ApiResponse>(url, { params, ...config });
    return this.extractData<T>(response.data);
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.client.post<ApiResponse>(url, data, config);
    return this.extractData<T>(response.data);
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<ApiResponse>(url, data);
    return this.extractData<T>(response.data);
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.patch<ApiResponse>(url, data);
    return this.extractData<T>(response.data);
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse>(url);
    return this.extractData<T>(response.data);
  }

  // File upload
  async upload<T>(url: string, file: File, fieldName = "file"): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const response = await this.client.post<ApiResponse>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return this.extractData<T>(response.data);
  }

  private extractData<T>(data: ApiResponse): T {
    if (data && typeof data === "object" && "data" in data) {
      return (data as ApiResponse & { data: T }).data;
    }
    return data as T;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
