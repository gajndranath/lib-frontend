import { apiClient } from "@/api/axios";
import type { NotificationData, WebPushSubscription } from "@/types/api.types";

// Type for ServiceWorkerRegistration with sync
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync?: {
    register: (tag: string) => Promise<void>;
  };
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>;
  };
}

// Helper function to convert PushSubscription to WebPushSubscription
function pushSubscriptionToWebPush(
  subscription: PushSubscription
): WebPushSubscription {
  const json = subscription.toJSON();

  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid subscription data");
  }

  return {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  };
}

class WebPushService {
  private isSupported: boolean = false;
  private registration: ServiceWorkerRegistrationWithSync | null = null;
  private subscription: PushSubscription | null = null;

  constructor() {
    this.checkSupport();
  }

  private async checkSupport(): Promise<void> {
    this.isSupported = "serviceWorker" in navigator && "PushManager" in window;

    if (!this.isSupported) {
      console.warn("Web Push not supported in this browser");
      return;
    }

    await this.registerServiceWorker();
  }

  private async registerServiceWorker(): Promise<void> {
    try {
      this.registration = (await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      })) as ServiceWorkerRegistrationWithSync;

      console.log("Service Worker registered:", this.registration);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      return "denied";
    }

    try {
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  }

  async subscribeToPush(): Promise<WebPushSubscription | null> {
    if (!this.isSupported || !this.registration) {
      console.warn(
        "Cannot subscribe: Web Push not supported or SW not registered"
      );
      return null;
    }

    try {
      // Get VAPID public key from server
      const response = await apiClient.get<{ data: string }>(
        "/notification/vapid-public-key"
      );
      const publicKey = response.data;

      // Convert VAPID key
      const convertedVapidKey = this.urlBase64ToUint8Array(publicKey);

      // Ensure we have a proper ArrayBuffer (not SharedArrayBuffer)
      const applicationServerKey = this.ensureArrayBuffer(convertedVapidKey);

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      this.subscription = subscription;

      // Convert to WebPushSubscription format
      const webPushSubscription = pushSubscriptionToWebPush(subscription);

      // Send subscription to server
      await apiClient.post("/notification/subscribe", {
        subscription: webPushSubscription,
        type: "web",
      });

      console.log("Subscribed to push notifications");
      return webPushSubscription;
    } catch (error: unknown) {
      console.error("Error subscribing to push notifications:", error);
      return null;
    }
  }

  // Helper method to ensure we get a proper ArrayBuffer
  private ensureArrayBuffer(uint8Array: Uint8Array): ArrayBuffer {
    // If it's already a regular ArrayBuffer, use it
    if (!(uint8Array.buffer instanceof SharedArrayBuffer)) {
      return uint8Array.buffer;
    }

    // Otherwise create a new regular ArrayBuffer
    const newBuffer = new ArrayBuffer(uint8Array.length);
    const newView = new Uint8Array(newBuffer);
    newView.set(uint8Array);
    return newBuffer;
  }

  async unsubscribeFromPush(): Promise<boolean> {
    if (!this.subscription || !this.registration) {
      return false;
    }

    try {
      const success = await this.subscription.unsubscribe();
      if (success) {
        await apiClient.post("/notification/unsubscribe", {
          type: "web",
        });

        this.subscription = null;
        console.log("Unsubscribed from push notifications");
        return true;
      }
      return false;
    } catch (error: unknown) {
      console.error("Error unsubscribing from push:", error);
      return false;
    }
  }

  async sendTestNotification(message: string): Promise<void> {
    try {
      await apiClient.post("/notification/test", { message });
    } catch (error: unknown) {
      console.error("Error sending test notification:", error);
    }
  }

  async checkSubscription(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    const subscription = await this.registration.pushManager.getSubscription();
    this.subscription = subscription;
    return !!subscription;
  }

  // Handle incoming push notifications
  setupNotificationHandler(): void {
    if (!this.registration) {
      return;
    }

    // Listen for push events
    navigator.serviceWorker.addEventListener(
      "message",
      (event: MessageEvent) => {
        this.handleNotificationMessage(event.data as NotificationData);
      }
    );
  }

  private handleNotificationMessage(data: NotificationData): void {
    console.log("Received notification:", data);

    // Emit event for UI to handle
    const event = new CustomEvent("push-notification", { detail: data });
    window.dispatchEvent(event);
  }

  // Background sync for offline payments
  async registerBackgroundSync(tag = "sync-payments"): Promise<void> {
    if (!this.registration || !this.registration.sync) {
      console.warn("Background Sync not supported");
      return;
    }

    try {
      await this.registration.sync.register(tag);
      console.log("Background Sync registered:", tag);
    } catch (error: unknown) {
      console.error("Error registering Background Sync:", error);
    }
  }

  // Periodic background sync
  async registerPeriodicSync(
    tag = "refresh-dashboard",
    minInterval = 12 * 60 * 60 * 1000
  ): Promise<void> {
    if (!this.registration || !this.registration.periodicSync) {
      console.warn("Periodic Background Sync not supported");
      return;
    }

    try {
      await this.registration.periodicSync.register(tag, {
        minInterval,
      });
      console.log("Periodic Sync registered:", tag);
    } catch (error: unknown) {
      console.error("Error registering Periodic Sync:", error);
    }
  }

  // Helper function to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  // Get current subscription
  getSubscription(): WebPushSubscription | null {
    if (!this.subscription) {
      return null;
    }

    try {
      return pushSubscriptionToWebPush(this.subscription);
    } catch (error) {
      console.error("Error converting subscription:", error);
      return null;
    }
  }

  // Check if push is supported
  isPushSupported(): boolean {
    return this.isSupported;
  }

  // Check if permission is granted
  async isPermissionGranted(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    const permission = Notification.permission;
    return permission === "granted";
  }
}

export const webPushService = new WebPushService();
