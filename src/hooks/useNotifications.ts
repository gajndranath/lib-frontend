import { useEffect } from "react";
import { NotificationsAPI } from "@/api/notifications.api";
import { useNotificationStore } from "@/store/notification.store";
import { webPushService } from "@/services/notification.service";
import { socketService } from "@/services/socket.service";
import type { NotificationData } from "@/types/api.types";
import { toast } from "sonner";

interface CustomPushEvent extends Event {
  detail: NotificationData;
}

export const useNotifications = () => {
  const {
    addNotification,
    markAsRead,
    clearAll,
    setPermission,
    setIsSubscribed,
    notifications,
    unreadCount,
  } = useNotificationStore();

  // Initialize notification system
  useEffect(() => {
    // Check notification permission
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    // Check subscription status
    webPushService.checkSubscription().then((isSubscribed) => {
      setIsSubscribed(isSubscribed);
    });

    // Listen for push notifications
    const handlePushNotification = (event: Event) => {
      const customEvent = event as CustomPushEvent;
      const notification = customEvent.detail;
      addNotification(notification);
      toast.info(notification.title, {
        description: notification.body,
        duration: 5000,
      });
    };

    window.addEventListener("push-notification", handlePushNotification);

    // Listen for socket notifications
    const handleSocketNotification = (notification: NotificationData) => {
      addNotification(notification);
    };

    socketService.on("new_notification", handleSocketNotification);

    return () => {
      window.removeEventListener("push-notification", handlePushNotification);
      socketService.off("new_notification", handleSocketNotification);
    };
  }, [addNotification, setPermission, setIsSubscribed]);

  // Request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      toast.error("Notifications not supported in this browser");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        toast.success("Notifications enabled");
        return true;
      } else {
        toast.warning("Notifications not granted");
        return false;
      }
    } catch (error: unknown) {
      console.error("Failed to request notification permission:", error);
      toast.error("Failed to request notification permission");
      return false;
    }
  };

  // Subscribe to push notifications
  const subscribeToPush = async (): Promise<boolean> => {
    try {
      const permissionGranted = await requestPermission();
      if (!permissionGranted) return false;

      const subscription = await webPushService.subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        toast.success("Push notifications enabled");
        return true;
      }
      return false;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to subscribe: ${errorMessage}`);
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribeFromPush = async (): Promise<boolean> => {
    try {
      await webPushService.unsubscribeFromPush();
      setIsSubscribed(false);
      toast.success("Push notifications disabled");
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to unsubscribe: ${errorMessage}`);
      return false;
    }
  };

  // Send test notification
  const sendTestNotification = async (message: string): Promise<void> => {
    try {
      await NotificationsAPI.sendTest(message);
      toast.success("Test notification sent");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to send test: ${errorMessage}`);
    }
  };

  // Clear all notifications
  const handleClearAll = async (): Promise<void> => {
    try {
      await NotificationsAPI.clearAll();
      clearAll();
      toast.success("All notifications cleared");
    } catch {
      toast.error("Failed to clear notifications");
    }
  };

  return {
    notifications,
    unreadCount,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification,
    markAsRead,
    clearAll: handleClearAll,
    isSupported: "Notification" in window && "serviceWorker" in navigator,
  };
};
