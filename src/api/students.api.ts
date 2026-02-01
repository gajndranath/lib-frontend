import axiosInstance, { apiCall } from "./axios";
import type {
  Student,
  StudentWithDetails,
  ApiResponse,
  RegisterStudentFormData,
} from "@/types";

export const studentApi = {
  // Register student
  registerStudent: (data: RegisterStudentFormData) =>
    apiCall<ApiResponse<Student>>(axiosInstance.post("/students", data), {
      showSuccess: true,
      successMessage: "Student registered successfully",
    }),

  // Update student
  updateStudent: (studentId: string, data: Partial<RegisterStudentFormData>) =>
    apiCall<ApiResponse<Student>>(
      axiosInstance.patch(`/students/${studentId}`, data),
      { showSuccess: true, successMessage: "Student updated successfully" },
    ),

  // Archive student
  archiveStudent: (studentId: string, reason: string) =>
    apiCall<ApiResponse<Student>>(
      axiosInstance.patch(`/students/${studentId}/archive`, { reason }),
      { showSuccess: true, successMessage: "Student archived successfully" },
    ),

  // Reactivate student
  reactivateStudent: (studentId: string) =>
    apiCall<ApiResponse<Student>>(
      axiosInstance.patch(`/students/${studentId}/reactivate`),
      { showSuccess: true, successMessage: "Student reactivated successfully" },
    ),

  // Get student details
  getStudentDetails: (studentId: string) =>
    apiCall<ApiResponse<StudentWithDetails>>(
      axiosInstance.get(`/students/${studentId}`),
    ),

  // Search students
  searchStudents: (params: {
    query?: string;
    status?: string;
    slotId?: string;
    page?: number;
    limit?: number;
  }) =>
    apiCall<
      ApiResponse<{
        students: Student[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>
    >(axiosInstance.get("/students", { params })),

  // Get students by slot
  getStudentsBySlot: (slotId: string, status?: string) =>
    apiCall<ApiResponse<Student[]>>(
      axiosInstance.get(`/students/slot/${slotId}`, { params: { status } }),
    ),
  // Change student slot
  changeStudentSlot: (studentId: string, newSlotId: string) =>
    apiCall<
      ApiResponse<{
        student: Student;
        oldSlot: { slotId: string; slotName: string };
        newSlot: { id: string; name: string };
      }>
    >(
      axiosInstance.patch(`/students/${studentId}/change-slot`, { newSlotId }),
      { showSuccess: true, successMessage: "Slot changed successfully" },
    ),

  // Override student fee
  overrideStudentFee: (
    studentId: string,
    newMonthlyFee: number,
    reason: string,
  ) =>
    apiCall<ApiResponse<Student>>(
      axiosInstance.patch(`/students/${studentId}/override-fee`, {
        newMonthlyFee,
        reason,
      }),
      { showSuccess: true, successMessage: "Fee overridden successfully" },
    ),

  // Save push subscription
  savePushSubscription: (
    studentId: string,
    data: {
      subscription: PushSubscriptionJSON;
      type?: "web" | "fcm";
      deviceInfo?: Record<string, unknown>;
    },
  ) =>
    apiCall<ApiResponse<null>>(
      axiosInstance.post(`/students/${studentId}/subscribe`, data),
      { showSuccess: true, successMessage: "Subscription saved" },
    ),

  // Remove push subscription
  removePushSubscription: (studentId: string, type?: "web" | "fcm") =>
    apiCall<ApiResponse<null>>(
      axiosInstance.post(`/students/${studentId}/unsubscribe`, { type }),
      { showSuccess: true, successMessage: "Subscription removed" },
    ),
};
