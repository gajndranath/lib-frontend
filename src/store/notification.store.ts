import { create } from "zustand";
import type { NotificationData } from "@/types/api.types";

interface NotificationState {
  notifications: NotificationData[];
  unreadCount: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  permission: NotificationPermission | null;
  isSubscribed: boolean;
}

interface NotificationActions {
  addNotification: (notification: NotificationData) => void;
  markAsRead: (notificationId?: string) => void;
  clearAll: () => void;
  removeNotification: (notificationId: string) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setVibrationEnabled: (enabled: boolean) => void;
  setPermission: (permission: NotificationPermission) => void;
  setIsSubscribed: (subscribed: boolean) => void;
  updateUnreadCount: () => void;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  soundEnabled: true,
  vibrationEnabled: true,
  permission: null,
  isSubscribed: false,
};

export const useNotificationStore = create<
  NotificationState & NotificationActions
>((set, get) => ({
  ...initialState,

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50), // Keep last 50
      unreadCount: state.unreadCount + 1,
    }));

    // Play sound if enabled
    if (get().soundEnabled) {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {});
    }

    // Vibrate if enabled and supported
    if (get().vibrationEnabled && "vibrate" in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  },

  markAsRead: (notificationId?: string) => {
    set((state) => {
      if (notificationId) {
        // Mark specific notification as read
        const updatedNotifications = state.notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        );

        const unreadCount = updatedNotifications.filter((n) => !n.read).length;

        return {
          notifications: updatedNotifications,
          unreadCount,
        };
      } else {
        // Mark all as read
        const updatedNotifications = state.notifications.map((notif) => ({
          ...notif,
          read: true,
        }));

        return {
          notifications: updatedNotifications,
          unreadCount: 0,
        };
      }
    });
  },

  clearAll: () => {
    set({
      notifications: [],
      unreadCount: 0,
    });
  },

  removeNotification: (notificationId) => {
    set((state) => {
      const updatedNotifications = state.notifications.filter(
        (notif) => notif.id !== notificationId
      );

      const unreadCount = updatedNotifications.filter((n) => !n.read).length;

      return {
        notifications: updatedNotifications,
        unreadCount,
      };
    });
  },

  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
  },

  setVibrationEnabled: (enabled) => {
    set({ vibrationEnabled: enabled });
  },

  setPermission: (permission) => {
    set({ permission });
  },

  setIsSubscribed: (subscribed) => {
    set({ isSubscribed: subscribed });
  },

  updateUnreadCount: () => {
    const unreadCount = get().notifications.filter((n) => !n.read).length;
    set({ unreadCount });
  },
}));
