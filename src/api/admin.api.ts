import axiosInstance, { apiCall } from "./axios";
import type {
  Admin,
  DashboardStats,
  FinancialReport,
  ApiResponse,
  NotificationPreferences,
} from "@/types";

export const adminApi = {
  // Login
  login: (credentials: { email: string; password: string }) =>
    apiCall<ApiResponse<{ admin: Admin; accessToken: string }>>(
      axiosInstance.post("/admin/login", credentials),
      { showSuccess: true, successMessage: "Login successful" },
    ),

  // Get profile
  getProfile: () =>
    apiCall<ApiResponse<Admin>>(axiosInstance.get("/admin/profile")),

  // Update own profile
  updateOwnProfile: (data: {
    username?: string;
    email?: string;
    phone?: string;
  }) =>
    apiCall<ApiResponse<Admin>>(axiosInstance.patch("/admin/profile", data), {
      showSuccess: true,
      successMessage: "Profile updated successfully",
    }),

  // Change password
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiCall<ApiResponse<null>>(
      axiosInstance.post("/admin/profile/change-password", data),
      { showSuccess: true, successMessage: "Password changed successfully" },
    ),

  // Register new admin (SUPER_ADMIN only)
  registerAdmin: (data: {
    username: string;
    email: string;
    password?: string;
    phone?: string;
    role?: "SUPER_ADMIN" | "STAFF";
  }) =>
    apiCall<ApiResponse<Admin>>(axiosInstance.post("/admin/register", data), {
      showSuccess: true,
      successMessage: "Admin registered successfully",
    }),

  // Get all admins (SUPER_ADMIN only)
  getAllAdmins: () =>
    apiCall<ApiResponse<Admin[]>>(axiosInstance.get("/admin")),

  // Update admin (SUPER_ADMIN only)
  updateAdmin: (
    adminId: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      status?: string;
    },
  ) =>
    apiCall<ApiResponse<Admin>>(
      axiosInstance.patch(`/admin/${adminId}`, data),
      { showSuccess: true, successMessage: "Admin updated successfully" },
    ),

  // Delete admin (SUPER_ADMIN only)
  deleteAdmin: (adminId: string) =>
    apiCall<ApiResponse<null>>(axiosInstance.delete(`/admin/${adminId}`), {
      showSuccess: true,
      successMessage: "Admin deleted successfully",
    }),

  // Get dashboard stats
  getDashboardStats: () =>
    apiCall<ApiResponse<DashboardStats>>(
      axiosInstance.get("/admin/dashboard-stats"),
    ),

  // Get financial report
  getFinancialReport: (params: {
    startMonth: number;
    startYear: number;
    endMonth: number;
    endYear: number;
  }) =>
    apiCall<ApiResponse<FinancialReport>>(
      axiosInstance.get("/admin/reports", { params }),
    ),

  // Get staff list (SUPER_ADMIN only)
  getStaffList: () =>
    apiCall<ApiResponse<Admin[]>>(axiosInstance.get("/admin/staff")),

  // Get notification preferences
  getNotificationPreferences: () =>
    apiCall<ApiResponse<NotificationPreferences>>(
      axiosInstance.get("/admin/notifications/preferences"),
    ),

  // Update notification preferences
  updateNotificationPreferences: (preferences: NotificationPreferences) =>
    apiCall<ApiResponse<NotificationPreferences>>(
      axiosInstance.patch("/admin/notifications/preferences", preferences),
      { showSuccess: true, successMessage: "Preferences updated" },
    ),

  // Generate monthly fees (for testing/admin purposes)
  generateMonthlyFees: (month: number, year: number) =>
    apiCall<
      ApiResponse<{
        generated: number;
        skipped: number;
        errors: Array<{ student: string; error: string }>;
      }>
    >(axiosInstance.post("/admin/generate-fees", { month, year }), {
      showSuccess: true,
      successMessage: `Monthly fees generated for ${month + 1}/${year}`,
    }),
};
