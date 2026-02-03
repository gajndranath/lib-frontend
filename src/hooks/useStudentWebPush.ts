import { useState, useCallback, useEffect } from "react";
import { studentAuthApi } from "@/api/studentAuth.api";
import { useNotificationStore } from "@/store/notification.store";
import { toast } from "sonner";

export const useStudentWebPush = () => {
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const { setPermissionGranted, setWebPushSupported } = useNotificationStore();

  const checkPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setPermissionGranted(false);
      return;
    }

    const permission = Notification.permission;
    setPermissionGranted(permission === "granted");
  }, [setPermissionGranted]);

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

  const getVapidKey = useCallback(async () => {
    const { data } = await studentAuthApi.getVapidKey();
    return data?.data?.publicKey;
  }, []);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications are not supported in this browser");
      return false;
    }

    setLoading(true);

    try {
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

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidPublicKey = await getVapidKey();
      if (!vapidPublicKey) {
        throw new Error("VAPID key not available");
      }

      const applicationServerKey = urlBase64ToUint8Array(
        vapidPublicKey,
      ) as BufferSource;

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const { error } = await studentAuthApi.savePushSubscription({
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

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    setLoading(true);

    try {
      const unsubscribed = await subscription.unsubscribe();

      if (unsubscribed) {
        await studentAuthApi.removePushSubscription("web");
        setSubscription(null);
        toast.success("Push notifications disabled");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Failed to disable push notifications");
      return false;
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  return {
    subscription,
    loading,
    checkPermission,
    getSubscription,
    subscribe,
    unsubscribe,
  };
};

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};
