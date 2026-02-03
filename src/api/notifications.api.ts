import axiosInstance, { apiCall } from "./axios";
import type {
  Notification,
  NotificationPreferences,
  ApiResponse,
} from "@/types";

export const notificationApi = {
  // Save push subscription
  savePushSubscription: (data: {
    subscription: PushSubscriptionJSON;
    type?: "web" | "fcm";
    deviceInfo?: Record<string, unknown>;
  }) =>
    apiCall<ApiResponse<null>>(
      axiosInstance.post("/notification/subscribe", data),
      { showSuccess: true, successMessage: "Subscription saved" },
    ),

  // Remove push subscription
  removePushSubscription: (type?: "web" | "fcm") =>
    apiCall<ApiResponse<null>>(
      axiosInstance.post("/notification/unsubscribe", { type }),
      { showSuccess: true, successMessage: "Subscription removed" },
    ),

  // Test notification channels
  testNotificationChannels: () =>
    apiCall<ApiResponse<null>>(axiosInstance.post("/notification/test"), {
      showSuccess: true,
      successMessage: "Test notifications sent",
    }),

  // Get VAPID public key
  getVapidKey: () =>
    apiCall<ApiResponse<{ publicKey: string }>>(
      axiosInstance.get("/notification/vapid-key"),
    ),

  // Get notification history
  getNotificationHistory: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    search?: string;
    type?: string;
  }) =>
    apiCall<
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
    >(axiosInstance.get("/notification/history", { params })),

  // Mark notification as read
  markAsRead: (notificationId: string) =>
    apiCall<ApiResponse<Notification>>(
      axiosInstance.patch(`/notification/read/${notificationId}`),
      { showSuccess: true, successMessage: "Notification marked as read" },
    ),

  // Mark all notifications as read
  markAllAsRead: () =>
    apiCall<ApiResponse<{ unreadCount: number }>>(
      axiosInstance.patch("/notification/read-all"),
      { showSuccess: true, successMessage: "All notifications marked as read" },
    ),

  // Get notification preferences
  getNotificationPreferences: () =>
    apiCall<ApiResponse<NotificationPreferences>>(
      axiosInstance.get("/notification/preferences"),
    ),

  // Update notification preferences
  updateNotificationPreferences: (preferences: NotificationPreferences) =>
    apiCall<ApiResponse<NotificationPreferences>>(
      axiosInstance.put("/notification/preferences", { preferences }),
      { showSuccess: true, successMessage: "Preferences updated" },
    ),

  /**
   * Send direct notification to a student
   * Used for sending payment reminders from DueTracking
   */
  sendDirectNotification: (params: {
    studentId: string;
    channel: "email" | "sms" | "push" | "in-app" | "all";
    title?: string;
    message?: string;
  }) =>
    apiCall<ApiResponse<null>>(
      axiosInstance.post("/notification/send-to-student", params),
      { showSuccess: true, successMessage: "Reminder sent successfully" },
    ),
};
