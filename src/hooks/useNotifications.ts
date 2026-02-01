import { notificationApi } from "@/api/notifications.api";
import { useNotificationStore } from "@/store/notification.store";
import type { Notification } from "@/types";

export const useNotifications = () => {
  const {
    setNotifications,
    addNotifications,
    markAsRead: markAsReadLocal,
    markAllAsRead: markAllAsReadLocal,
    clearNotifications,
    setUnreadCount,
  } = useNotificationStore();

  const refresh = async (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) => {
    const { data, error } = await notificationApi.getNotificationHistory(
      params ?? {},
    );
    if (error) throw error;
    if (data?.data) {
      setNotifications(data.data.notifications);
      setUnreadCount(data.data.unreadCount);
    }
    return data?.data;
  };

  const append = (notifications: Notification[]) => {
    addNotifications(notifications);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await notificationApi.markAsRead(notificationId);
    if (error) throw error;
    markAsReadLocal(notificationId);
  };

  const markAllAsRead = async () => {
    const { data, error } = await notificationApi.markAllAsRead();
    if (error) throw error;
    markAllAsReadLocal();
    if (data?.data?.unreadCount !== undefined) {
      setUnreadCount(data.data.unreadCount);
    }
  };

  const clearAll = async () => {
    await markAllAsRead();
    clearNotifications();
  };

  return {
    refresh,
    append,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
};
