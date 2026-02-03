import { type ReactNode, useEffect, useState } from "react";
import { useNotificationStore } from "@/store/notification.store";
import { notificationApi } from "@/api/notifications.api";
import { useAuthStore } from "@/store/auth.store"; // ✅ Directly use auth store
import { useWebPush } from "@/hooks/useWebPush";
import { useSocket } from "@/hooks/useSocket";

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { admin, isAuthenticated } = useAuthStore(); // ✅ Direct access
  const { setNotifications, setUnreadCount } = useNotificationStore();
  const { checkPermission, getSubscription, subscribe, subscription } =
    useWebPush();
  const [initialized, setInitialized] = useState(false);
  useSocket();

  // Load notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && admin) {
      const loadNotifications = async () => {
        try {
          const { data } = await notificationApi.getNotificationHistory({
            limit: 20,
            unreadOnly: false,
          });

          if (data?.data) {
            setNotifications(data.data.notifications);
            setUnreadCount(data.data.unreadCount);
          }
        } catch (error) {
          console.error("Failed to load notifications:", error);
        } finally {
          setInitialized(true);
        }
      };

      loadNotifications();
    } else {
      setInitialized(true);
    }
  }, [isAuthenticated, admin, setNotifications, setUnreadCount]);

  // Initialize push notifications
  useEffect(() => {
    if (
      initialized &&
      isAuthenticated &&
      admin?.notificationPreferences?.push
    ) {
      checkPermission();
      getSubscription();

      if ("Notification" in window && Notification.permission !== "denied") {
        if (!subscription) {
          subscribe();
        }
      }
    }
  }, [
    initialized,
    isAuthenticated,
    admin,
    checkPermission,
    getSubscription,
    subscribe,
    subscription,
  ]);

  // Show loading while initializing (optional)
  if (!initialized) {
    return null; // Or a loading spinner if you prefer
  }

  return <>{children}</>;
};
