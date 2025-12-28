import { apiClient } from "./axios";
import type {
  Student,
  StudentFormData,
  PaymentFormData,
  DashboardData,
  PaginatedResponse,
  Ledger,
  StudentHistoryResponse,
  PaymentSummaryResponse
} from "@/types/api.types";

export const StudentsAPI = {
  // Dashboard
  getDashboardData: async (
    month: number,
    year: number
  ): Promise<DashboardData> => {
    return apiClient.get("/students/dashboard", { month, year });
  },

  // Students CRUD
  getStudents: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<PaginatedResponse<Student>> => {
    return apiClient.get("/students/list", params);
  },

  getStudentById: async (id: string): Promise<Student> => {
    return apiClient.get(`/students/${id}`);
  },

  createStudent: async (data: StudentFormData): Promise<Student> => {
    return apiClient.post("/students/register", data);
  },

  updateStudent: async (
    id: string,
    data: Partial<StudentFormData>
  ): Promise<Student> => {
    return apiClient.patch(`/students/${id}`, data);
  },

  deleteStudent: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/students/${id}`);
  },

  // Payments
  updatePaymentStatus: async (data: PaymentFormData): Promise<Ledger> => {
    return apiClient.patch("/students/update-payment", data);
  },

  getStudentHistory: async (
    studentId: string
  ): Promise<StudentHistoryResponse> => {
    return apiClient.get(`/students/${studentId}/history`);
  },

  toggleReminder: async (
    studentId: string,
    pause: boolean
  ): Promise<Student> => {
    return apiClient.patch("/students/toggle-reminder", { studentId, pause });
  },

  // Export
  exportData: async (month: number, year: number): Promise<Blob> => {
    return apiClient.get(
      "/students/export",
      { month, year },
      {
        responseType: "blob" as const,
      }
    );
  },

  // Get payment summary
  getPaymentSummary: async (studentId: string): Promise<PaymentSummaryResponse> => {
    return apiClient.get(`/students/${studentId}/summary`);
  },
};