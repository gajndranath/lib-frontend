import { create } from "zustand";
import type { Notification } from "@/types";

// ✅ RULE: Max notifications in store to prevent unbounded growth
const MAX_NOTIFICATIONS = 100;

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isPermissionGranted: boolean;
  isWebPushSupported: boolean;
  isFCMSupported: boolean;
}

interface NotificationActions {
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void;
  setNotifications: (notifications: Notification[]) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  setUnreadCount: (count: number) => void;
  setPermissionGranted: (granted: boolean) => void;
  setWebPushSupported: (supported: boolean) => void;
  setFCMSupported: (supported: boolean) => void;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isPermissionGranted: false,
  isWebPushSupported: "serviceWorker" in navigator && "PushManager" in window,
  isFCMSupported: typeof window !== "undefined" && "Notification" in window,
};

export const useNotificationStore = create<
  NotificationState & NotificationActions
>()((set, _get) => ({
  ...initialState,

  addNotification: (notification) =>
    set((state) => {
      if (state.notifications.some((n) => n._id === notification._id)) {
        return state;
      }

      // ✅ Keep only last MAX_NOTIFICATIONS (100)
      const updated = [notification, ...state.notifications].slice(
        0,
        MAX_NOTIFICATIONS,
      );

      return {
        notifications: updated,
        unreadCount: notification.read
          ? state.unreadCount
          : state.unreadCount + 1,
      };
    }),

  addNotifications: (notifications) =>
    set((state) => {
      const existingIds = new Set(state.notifications.map((n) => n._id));
      const newNotifications = notifications.filter(
        (n) => !existingIds.has(n._id),
      );

      // ✅ Keep only last MAX_NOTIFICATIONS (100)
      const updated = [...newNotifications, ...state.notifications].slice(
        0,
        MAX_NOTIFICATIONS,
      );

      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  setNotifications: (notifications) =>
    set(() => ({
      notifications: notifications.slice(0, MAX_NOTIFICATIONS), // ✅ Limit size
      unreadCount: notifications
        .slice(0, MAX_NOTIFICATIONS)
        .filter((n) => !n.read).length,
    })),

  markAsRead: (notificationId) =>
    set((state) => {
      const updatedNotifications = state.notifications.map((notification) =>
        notification._id === notificationId
          ? { ...notification, read: true, readAt: new Date() }
          : notification,
      );

      const unreadCount = updatedNotifications.filter((n) => !n.read).length;

      return {
        notifications: updatedNotifications,
        unreadCount,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
        readAt: new Date(),
      })),
      unreadCount: 0,
    })),

  removeNotification: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find(
        (n) => n._id === notificationId,
      );
      const unreadCount =
        notification && !notification.read
          ? state.unreadCount - 1
          : state.unreadCount;

      return {
        notifications: state.notifications.filter(
          (n) => n._id !== notificationId,
        ),
        unreadCount,
      };
    }),

  clearNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  setPermissionGranted: (granted) => set({ isPermissionGranted: granted }),

  setWebPushSupported: (supported) => set({ isWebPushSupported: supported }),

  setFCMSupported: (supported) => set({ isFCMSupported: supported }),
}));
