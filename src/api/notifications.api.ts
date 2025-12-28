import { apiClient } from "./axios";
import type { 
  WebPushSubscription, 
  NotificationSubscribeResponse,
  NotificationTestResponse,
  NotificationData
} from "@/types/api.types";

type NotificationType = "web" | "fcm";

export const NotificationsAPI = {
  // Save push subscription
  subscribe: async (
    subscription: WebPushSubscription,
    type: NotificationType = "web"
  ): Promise<NotificationSubscribeResponse> => {
    return apiClient.post("/notification/subscribe", { subscription, type });
  },

  // Unsubscribe
  unsubscribe: async (type: NotificationType = "web"): Promise<{ success: boolean }> => {
    return apiClient.post("/notification/unsubscribe", { type });
  },

  // Send test notification
  sendTest: async (message: string): Promise<NotificationTestResponse> => {
    return apiClient.post("/notification/test", { message });
  },

  // Get VAPID public key
  getVapidPublicKey: async (): Promise<string> => {
    return apiClient.get("/notification/vapid-public-key");
  },

  // Get notification history
  getHistory: async (): Promise<NotificationData[]> => {
    return apiClient.get("/notification/history");
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
    return apiClient.patch(`/notification/${notificationId}/read`);
  },

  // Clear all notifications
  clearAll: async (): Promise<{ success: boolean }> => {
    return apiClient.delete("/notification/clear");
  },
};