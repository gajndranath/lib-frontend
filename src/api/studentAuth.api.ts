import studentAxios, { studentApiCall } from "./studentAxios";
import type { ApiResponse, Notification, Student } from "@/types";

export interface SlotChangeHistory {
  _id: string;
  studentId: string;
  previousSlotId: {
    _id: string;
    name: string;
    timeRange: { start: string; end: string };
    monthlyFee: number;
  };
  previousSlotName: string;
  newSlotId: {
    _id: string;
    name: string;
    timeRange: { start: string; end: string };
    monthlyFee: number;
  };
  newSlotName: string;
  changeType: "ADMIN_INITIATED" | "STUDENT_REQUESTED" | "STUDENT_APPROVED";
  changedBy: string;
  changedByRole: "ADMIN" | "STUDENT";
  reason?: string;
  effectiveDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

  getVapidKey: () =>
    studentApiCall<ApiResponse<{ publicKey: string }>>(
      studentAxios.get("/student-auth/notifications/vapid-key"),
    ),

  savePushSubscription: (data: {
    subscription: PushSubscriptionJSON;
    type?: "web" | "fcm";
    deviceInfo?: Record<string, unknown>;
  }) =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-auth/notifications/subscribe", data),
      { showSuccess: true, successMessage: "Subscription saved" },
    ),

  removePushSubscription: (type?: "web" | "fcm") =>
    studentApiCall<ApiResponse<null>>(
      studentAxios.post("/student-auth/notifications/unsubscribe", { type }),
      { showSuccess: true, successMessage: "Subscription removed" },
    ),

  verifyPhone: (data: { idToken: string }) =>
    studentApiCall<ApiResponse<Student>>(
      studentAxios.post("/student-auth/verify-phone", data),
    ),

  // Slot change requests
  requestSlotChange: (data: { newSlotId: string; reason?: string }) =>
    studentApiCall<
      ApiResponse<{
        message: string;
        request: SlotChangeHistory;
        currentSlot: { id: string; name: string };
        requestedSlot: { id: string; name: string };
      }>
    >(studentAxios.post("/student-auth/slot/request-change", data), {
      showSuccess: true,
      successMessage: "Slot change request submitted successfully",
    }),

  getMySlotChangeHistory: () =>
    studentApiCall<ApiResponse<SlotChangeHistory[]>>(
      studentAxios.get("/student-auth/slot/change-history"),
    ),

  listChatStudents: () =>
    studentApiCall<ApiResponse<Array<{ _id: string; name: string }>>>(
      studentAxios.get("/student-auth/chat/students"),
    ),

  listChatAdmins: () =>
    studentApiCall<ApiResponse<Array<{ _id: string; username: string }>>>(
      studentAxios.get("/student-auth/chat/admins"),
    ),

  getPaymentReceipt: (month: number, year: number) =>
    studentApiCall<
      ApiResponse<{
        receiptNumber: string;
        studentName: string;
        studentPhone: string;
        monthYear: string;
        amount: number;
        paymentDate: string;
        paymentMethod: string;
        transactionId?: string;
        remarks?: string;
      }>
    >(studentAxios.get(`/student-auth/payments/${month}/${year}/receipt`)),

  downloadPaymentReceiptPDF: async (month: number, year: number) => {
    const response = await studentAxios.get(
      `/student-auth/payments/${month}/${year}/receipt-pdf`,
      { responseType: "blob" },
    );
    return response.data;
  },
};
