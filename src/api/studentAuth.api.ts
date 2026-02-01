import studentAxios, { studentApiCall } from "./studentAxios";
import type { ApiResponse, Notification, Student } from "@/types";

export const studentAuthApi = {
  register: (data: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    fatherName?: string;
  }) =>
    studentApiCall<ApiResponse<{ email: string; libraryId: string }>>(
      studentAxios.post("/student-auth/register", data),
      {
        showSuccess: true,
        successMessage: "Registration successful! Check your email for OTP.",
      },
    ),

  requestOtp: (data: {
    email: string;
    purpose?: "LOGIN" | "RESET" | "VERIFY";
  }) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-auth/request-otp", data),
      { showSuccess: true, successMessage: "OTP sent" },
    ),

  verifyOtp: (data: { email: string; otp: string; setPassword?: string }) =>
    studentApiCall<ApiResponse<{ student: Student; accessToken: string }>>(
      studentAxios.post("/student-auth/verify-otp", data),
    ),

  login: (data: { email: string; password: string }) =>
    studentApiCall<ApiResponse<{ student: Student; accessToken: string }>>(
      studentAxios.post("/student-auth/login", data),
    ),

  requestPasswordReset: (data: { email: string }) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-auth/forgot-password/request", data),
      { showSuccess: true, successMessage: "OTP sent" },
    ),

  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-auth/forgot-password/reset", data),
      { showSuccess: true, successMessage: "Password updated" },
    ),

  getProfile: () =>
    studentApiCall<ApiResponse<Student>>(studentAxios.get("/student-auth/me")),

  updateProfile: (data: Partial<Student>) =>
    studentApiCall<ApiResponse<Student>>(
      studentAxios.patch("/student-auth/profile", data),
      { showSuccess: true, successMessage: "Profile updated" },
    ),

  getDashboard: () =>
    studentApiCall<
      ApiResponse<{
        student: Student;
        feeSummary: unknown;
        recentPayments: unknown[];
        dueItems: unknown[];
      }>
    >(studentAxios.get("/student-auth/dashboard")),

  getPayments: (params?: { page?: number; limit?: number }) =>
    studentApiCall<
      ApiResponse<{
        payments: unknown[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>
    >(studentAxios.get("/student-auth/payments", { params })),

  getNotifications: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) =>
    studentApiCall<
      ApiResponse<{
        notifications: Notification[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
        unreadCount: number;
      }>
    >(studentAxios.get("/student-auth/notifications", { params })),

  markNotificationRead: (notificationId: string) =>
    studentApiCall<ApiResponse<Notification>>(
      studentAxios.patch(`/student-auth/notifications/read/${notificationId}`),
    ),

  markAllNotificationsRead: () =>
    studentApiCall<ApiResponse<{ unreadCount: number }>>(
      studentAxios.patch("/student-auth/notifications/read-all"),
    ),

  verifyPhone: (data: { idToken: string }) =>
    studentApiCall<ApiResponse<Student>>(
      studentAxios.post("/student-auth/verify-phone", data),
    ),
};
