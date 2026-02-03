import { useState, useCallback, useEffect } from "react";
import { notificationApi } from "@/api/notifications.api";
import { useNotificationStore } from "@/store/notification.store";
import { toast } from "sonner";

export const useWebPush = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const { setPermissionGranted, setWebPushSupported } = useNotificationStore();

  // Check permission status
  const checkPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setPermissionGranted(false);
      return;
    }

    const permission = Notification.permission;
    setPermissionGranted(permission === "granted");
  }, [setPermissionGranted]);

  // Get current subscription
  const getSubscription = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const currentSubscription =
        await registration.pushManager.getSubscription();
      setSubscription(currentSubscription);
    } catch (error) {
      console.error("Error getting subscription:", error);
    }
  }, []);

  // Check service worker and push support
  useEffect(() => {
    const checkSupport = () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window;
      setWebPushSupported(supported);

      if (supported) {
        checkPermission();
        getSubscription();
      }
    };

    checkSupport();
  }, [setWebPushSupported, checkPermission, getSubscription]);

  // Get VAPID public key
  const getVapidKey = useCallback(async () => {
    const { data } = await notificationApi.getVapidKey();
    return data?.data?.publicKey;
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }

    setLoading(true);

    try {
      // Check permission
      let permission = Notification.permission;

      if (permission === "default") {
        permission = await Notification.requestPermission();
      }

      if (permission !== "granted") {
        toast.error("Permission denied for push notifications");
        setPermissionGranted(false);
        return false;
      }

      setPermissionGranted(true);

      // Get service worker registration
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID key
      const vapidPublicKey = await getVapidKey();
      if (!vapidPublicKey) {
        throw new Error("VAPID key not available");
      }

      // Convert VAPID key
      const applicationServerKey = urlBase64ToUint8Array(
        vapidPublicKey,
      ) as BufferSource;

      // Subscribe to push
      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Save subscription to backend
      const { error } = await notificationApi.savePushSubscription({
        subscription: newSubscription.toJSON(),
        type: "web",
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setSubscription(newSubscription);
      toast.success("Push notifications enabled");
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to enable push notifications";
      console.error("Error subscribing to push:", error);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [getVapidKey, setPermissionGranted]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    setLoading(true);

    try {
      // Unsubscribe from push service
      const unsubscribed = await subscription.unsubscribe();

      if (unsubscribed) {
        // Remove subscription from backend
        await notificationApi.removePushSubscription("web");

        setSubscription(null);
        toast.success("Push notifications disabled");
        return true;
      }

      return false;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to disable push notifications";
      console.error("Error unsubscribing from push:", error);
      toast.error(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  // Toggle subscription
  const toggleSubscription = useCallback(async () => {
    if (subscription) {
      return await unsubscribe();
    } else {
      return await subscribe();
    }
  }, [subscription, subscribe, unsubscribe]);

  return {
    subscription,
    loading,
    isSupported: useNotificationStore((state) => state.isWebPushSupported),
    isPermissionGranted: useNotificationStore(
      (state) => state.isPermissionGranted,
    ),
    isSubscribed: !!subscription,
    subscribe,
    unsubscribe,
    toggleSubscription,
    checkPermission,
    getSubscription,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
