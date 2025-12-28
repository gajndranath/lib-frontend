import { apiClient } from "./axios";
import type { 
  Admin, 
  LoginFormData, 
  LoginResponse,
  NotificationPreferences,
  MonthlyReport,
  DashboardStats,
  StaffListResponse
} from "@/types/api.types";

export const AdminAPI = {
  // Login
  login: async (data: LoginFormData): Promise<LoginResponse> => {
    return apiClient.post<LoginResponse>("/admin/login", data);
  },

  // Get profile
  getProfile: async (): Promise<Admin> => {
    return apiClient.get<Admin>("/admin/profile");
  },

  // Update notification preferences
  updateNotificationPreferences: async (preferences: NotificationPreferences): Promise<Admin> => {
    return apiClient.patch<Admin>("/admin/notifications/preferences", { preferences });
  },

  // Get dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    return apiClient.get<DashboardStats>("/admin/dashboard-stats");
  },

  // Get monthly report
  getMonthlyReport: async (month: number, year: number): Promise<MonthlyReport> => {
    return apiClient.get<MonthlyReport>("/admin/reports", { month, year });
  },

  // Get staff list (Super Admin only)
  getStaffList: async (): Promise<StaffListResponse> => {
    return apiClient.get<StaffListResponse>("/admin/staff");
  },

  // Logout
  logout: async (): Promise<void> => {
    // Clear local storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};