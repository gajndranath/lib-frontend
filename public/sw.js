// Service Worker for Library Management System
const CACHE_NAME = "library-pwa-v2";
const OFFLINE_URL = "/offline.html";
const API_CACHE_NAME = "library-api-cache";

// Files to cache on install
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json", "/vite.svg"];

// Install Event
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Caching App Shell");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log("Service Worker: Clearing old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch Event with Stale-While-Revalidate pattern for API calls
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Handle API requests
  if (event.request.url.includes("/api/")) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle static assets with Cache First strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Update cache in background
        event.waitUntil(
          fetch(event.request)
            .then((response) => {
              if (response.ok) {
                return caches.open(CACHE_NAME).then((cache) => {
                  return cache.put(event.request, response);
                });
              }
            })
            .catch(() => {
              /* Ignore errors */
            }),
        );
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          // Check if we received a valid response
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If offline and page request, show offline page
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL);
          }
        });
    }),
  );
});

// Handle API requests with Network First strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache the successful response
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    // If network fails, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw new Error("Network failed and no cache available");
  } catch (error) {
    // Both network and cache failed
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return generic error response for API calls
    return new Response(
      JSON.stringify({
        error: "Network unavailable",
        message: "Please check your internet connection",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Push Notification Event
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  if (!(self.Notification && self.Notification.permission === "granted")) {
    console.warn("Notification permission not granted");
    return;
  }

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error("Error parsing push data:", error);
    data = {
      title: "Library Management",
      body: "You have a new notification",
    };
  }

  const title = data.title || "Library Management System";
  const options = {
    body: data.body || data.message || "You have a new notification",
    icon: data.icon || "/vite.svg",
    badge: data.badge || "/vite.svg",
    data: data.data || {},
    actions: data.actions || [
      { action: "open", title: "Open App" },
      { action: "close", title: "Dismiss" },
    ],
    vibrate: data.vibrate || [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || `library-notification-${Date.now()}`,
    renotify: data.renotify || true,
    timestamp: data.timestamp || Date.now(),
    silent: false,
    sound: data.sound || "default",
  };

  event.waitUntil(
    self.registration
      .showNotification(title, options)
      .then(() => {
        console.log("Notification shown successfully");
        // Send message to all clients that notification was received
        return self.clients.matchAll({
          includeUncontrolled: true,
          type: "window",
        });
      })
      .then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "PUSH_NOTIFICATION_RECEIVED",
            data: data,
            timestamp: Date.now(),
          });
        });
      })
      .catch((error) => {
        console.error("Error showing notification:", error);
      }),
  );
});

// Notification Click Event
self.addEventListener("notificationclick", (event) => {
  console.log(
    "Notification clicked:",
    event.notification.tag,
    "Action:",
    event.action,
  );
  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Determine URL based on notification type and user type
  let urlToOpen = "/";

  if (notificationData.type) {
    switch (notificationData.type) {
      case "PAYMENT_REMINDER":
      case "PAYMENT_DUE":
      case "FEE_DUE":
      case "OVERDUE_ALERT":
        urlToOpen =
          notificationData.userType === "Student"
            ? "/student/payment-history"
            : "/fees/due-tracking";
        break;
      case "PAYMENT_CONFIRMATION":
        urlToOpen =
          notificationData.userType === "Student"
            ? "/student/payment-history"
            : "/dashboard";
        break;
      case "CHAT_MESSAGE":
        urlToOpen =
          notificationData.userType === "Student" ? "/student/chat" : "/chat";
        break;
      case "ANNOUNCEMENT":
        urlToOpen =
          notificationData.userType === "Student"
            ? "/student/announcements"
            : "/announcements";
        break;
      case "CALL":
        urlToOpen =
          notificationData.userType === "Student" ? "/student/chat" : "/chat";
        break;
      default:
        urlToOpen = notificationData.url || "/notifications";
    }
  }

  // Handle specific actions
  if (action === "open") {
    // Use the determined URL
  } else if (action === "close") {
    return;
  } else if (action === "view") {
    urlToOpen = notificationData.url || urlToOpen;
  } else if (action === "mark_paid") {
    urlToOpen = "/fees/mark-payment";
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);

          if (clientUrl.origin === targetUrl.origin) {
            return client.focus().then((focusedClient) => {
              focusedClient.postMessage({
                type: "NOTIFICATION_CLICK",
                url: urlToOpen,
                data: notificationData,
              });
              return focusedClient;
            });
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error("Error handling notification click:", error);
      }),
  );
});

// Background Sync Event
self.addEventListener("sync", (event) => {
  console.log("Background sync event:", event.tag);

  if (event.tag === "sync-payments") {
    event.waitUntil(syncPendingPayments());
  }

  if (event.tag === "refresh-data") {
    event.waitUntil(refreshDashboardData());
  }
});

// Periodic Sync (for Chrome)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "refresh-dashboard") {
    console.log("Periodic sync triggered");
    event.waitUntil(refreshDashboardData());
  }
});

// Sync pending payments
async function syncPendingPayments() {
  try {
    const cache = await caches.open("pending-payments");
    const keys = await cache.keys();

    for (const request of keys) {
      const payment = await cache.match(request);
      if (payment) {
        const paymentData = await payment.json();

        try {
          const response = await fetch("/api/v1/students/update-payment", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(paymentData),
          });

          if (response.ok) {
            await cache.delete(request);
            console.log("Synced payment:", paymentData);
          }
        } catch (error) {
          console.error("Failed to sync payment:", error);
        }
      }
    }
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Refresh dashboard data
async function refreshDashboardData() {
  try {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();

    const response = await fetch(
      `/api/v1/students/dashboard?month=${month}&year=${year}`,
      {
        headers: {
          "Cache-Control": "no-cache",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();

      // Update cache
      const cache = await caches.open(API_CACHE_NAME);
      await cache.put(
        new Request(`/api/v1/students/dashboard?month=${month}&year=${year}`),
        new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        }),
      );

      // Notify clients
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: "DASHBOARD_UPDATED",
          data: { month, year },
        });
      });

      console.log("Dashboard data refreshed");
    }
  } catch (error) {
    console.error("Failed to refresh dashboard:", error);
  }
}

// Message event from client
self.addEventListener("message", (event) => {
  console.log("Message from client:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.delete(CACHE_NAME);
    caches.delete(API_CACHE_NAME);
  }
});

// Error handling
self.addEventListener("error", (event) => {
  console.error("Service Worker error:", event.error);
});

self.addEventListener("unhandledrejection", (event) => {
  console.error("Service Worker unhandled rejection:", event.reason);
});
