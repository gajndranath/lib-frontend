import axiosInstance, { apiCall } from "./axios";
import type { ApiResponse } from "@/types";

export interface AdminReminder {
  _id: string;
  adminId: string;
  type: "DUE_STUDENTS" | "END_OF_MONTH_DUE" | "PAYMENT_PENDING" | "CUSTOM";
  title: string;
  message: string;
  affectedStudents: Array<{ _id: string; name: string; studentId: string }>;
  schedule: {
    type: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
    startDate: string;
    endDate?: string;
    nextTriggerDate?: string;
    lastTriggeredAt?: string;
  };
  deliverVia: string[];
  isActive: boolean;
  isPaused: boolean;
  pausedAt?: string;
  pauseReason?: string;
  notificationHistory: Array<{
    sentAt: string;
    channel: string;
    status: "SENT" | "FAILED" | "PENDING";
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface EndOfMonthDueSummary {
  month: number;
  year: number;
  totalDueStudents: number;
  students: Array<{
    studentId: {
      _id: string;
      name: string;
      studentId: string;
      email: string;
      phone: string;
      monthlyFee: number;
    };
    month: number;
    year: number;
    baseFee: number;
    totalAmount: number;
    status: string;
  }>;
  totalDueAmount: number;
}

export const reminderApi = {
  // Get my reminders
  getMyReminders: (filters?: { type?: string; isPaused?: boolean }) =>
    apiCall<ApiResponse<AdminReminder[]>>(
      axiosInstance.get("/reminders", {
        params: filters,
      }),
    ),

  // Get reminder details
  getReminderDetails: (reminderId: string) =>
    apiCall<ApiResponse<AdminReminder>>(
      axiosInstance.get(`/reminders/${reminderId}`),
    ),

  // Pause a reminder
  pauseReminder: (reminderId: string, reason?: string) =>
    apiCall<ApiResponse<AdminReminder>>(
      axiosInstance.post(`/reminders/${reminderId}/pause`, { reason }),
      {
        showSuccess: true,
        successMessage: "Reminder paused successfully",
      },
    ),

  // Resume a reminder
  resumeReminder: (reminderId: string) =>
    apiCall<ApiResponse<AdminReminder>>(
      axiosInstance.post(`/reminders/${reminderId}/resume`, {}),
      {
        showSuccess: true,
        successMessage: "Reminder resumed successfully",
      },
    ),

  // Stop a reminder
  stopReminder: (reminderId: string) =>
    apiCall<ApiResponse<AdminReminder>>(
      axiosInstance.post(`/reminders/${reminderId}/stop`, {}),
      {
        showSuccess: true,
        successMessage: "Reminder stopped successfully",
      },
    ),

  // Update reminder
  updateReminder: (
    reminderId: string,
    data: {
      title?: string;
      message?: string;
      deliverVia?: string[];
      schedule?: {
        type?: "ONCE" | "DAILY" | "WEEKLY" | "MONTHLY";
        startDate?: string;
        endDate?: string;
      };
    },
  ) =>
    apiCall<ApiResponse<AdminReminder>>(
      axiosInstance.patch(`/reminders/${reminderId}`, data),
      {
        showSuccess: true,
        successMessage: "Reminder updated successfully",
      },
    ),

  // Send reminder manually
  sendReminder: (reminderId: string) =>
    apiCall<ApiResponse<AdminReminder>>(
      axiosInstance.post(`/reminders/${reminderId}/send`, {}),
      {
        showSuccess: true,
        successMessage: "Reminder sent successfully",
      },
    ),

  // Get end-of-month due summary
  getEndOfMonthDueSummary: (month: number, year: number) =>
    apiCall<ApiResponse<EndOfMonthDueSummary>>(
      axiosInstance.get("/reminders/due-summary", {
        params: { month, year },
      }),
    ),
};
