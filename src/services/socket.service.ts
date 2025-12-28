import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/store/auth.store";
import type {
  SocketEventsMap,
  SocketPaymentSyncData,
  SocketDashboardUpdateData,
  SocketNotificationData,
  SocketNewStudentData,
  SocketAdminConnectionData,
  SocketAdminDisconnectionData,
} from "@/types/api.types";

type EventHandler<T = unknown> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, EventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;
  private keepAliveIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.setupEventHandlers();
  }

  connect(): void {
    const accessToken = localStorage.getItem("accessToken");
    const admin = useAuthStore.getState().admin;

    if (!accessToken || !admin) {
      console.warn("Cannot connect socket: No access token or admin data");
      return;
    }

    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    const SOCKET_URL =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

    this.socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    this.setupSocketEvents();
  }

  private setupSocketEvents(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      const admin = useAuthStore.getState().admin;
      if (admin) {
        this.socket?.emit("join_admin_room", {
          adminId: admin._id,
          role: admin.role,
        });
      }
    });

    this.socket.on("disconnect", (reason: string) => {
      console.log("Socket disconnected:", reason);
      this.isConnected = false;

      if (reason === "io server disconnect") {
        this.socket?.connect();
      }
    });

    this.socket.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn("Max reconnection attempts reached");
      }
    });

    this.socket.on("reconnect_attempt", (attemptNumber: number) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on("reconnect", (attemptNumber: number) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      this.isConnected = true;
    });

    this.registerListeners();
  }

  private registerListeners(): void {
    if (!this.socket) return;

    this.socket.on("payment_sync", (data: SocketPaymentSyncData) => {
      this.emitToListeners("payment_sync", data);
    });

    this.socket.on("dashboard_updated", (data: SocketDashboardUpdateData) => {
      this.emitToListeners("dashboard_updated", data);
    });

    this.socket.on("new_notification", (data: SocketNotificationData) => {
      this.emitToListeners("new_notification", data);
    });

    this.socket.on("new_student", (data: SocketNewStudentData) => {
      this.emitToListeners("new_student", data);
    });

    this.socket.on("admin_connected", (data: SocketAdminConnectionData) => {
      this.emitToListeners("admin_connected", data);
    });

    this.socket.on(
      "admin_disconnected",
      (data: SocketAdminDisconnectionData) => {
        this.emitToListeners("admin_disconnected", data);
      }
    );

    this.socket.on("connected_users", (data: { adminCount: number }) => {
      this.emitToListeners("connected_users", data);
    });

    this.socket.on("pong", (data: { timestamp: string }) => {
      this.emitToListeners("pong", data);
    });

    this.socket.on(
      "user_disconnected",
      (data: { socketId: string; reason: string }) => {
        this.emitToListeners("user_disconnected", data);
      }
    );
  }

  emit<K extends keyof SocketEventsMap>(
    event: K,
    ...args: Parameters<SocketEventsMap[K]>
  ): void {
    if (!this.socket || !this.isConnected) {
      console.warn(`Cannot emit ${String(event)}: Socket not connected`);
      return;
    }

    this.socket.emit(event, ...args);
  }

  on<K extends keyof SocketEventsMap>(
    event: K,
    handler: SocketEventsMap[K]
  ): void {
    const eventKey = event as string;
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, []);
    }
    const handlers = this.listeners.get(eventKey);
    if (handlers) {
      handlers.push(handler as EventHandler);
    }
  }

  off<K extends keyof SocketEventsMap>(
    event: K,
    handler: SocketEventsMap[K]
  ): void {
    const eventKey = event as string;
    const handlers = this.listeners.get(eventKey);
    if (handlers) {
      const index = handlers.findIndex((h) => h === handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emitToListeners(event: string, data: unknown): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  disconnect(): void {
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }

    if (this.socket) {
      const adminId = useAuthStore.getState().admin?._id;
      if (adminId) {
        this.socket.emit("admin_disconnecting", adminId);
      }

      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getSocketId(): string | null {
    return this.socket?.id || null;
  }

  ping(): void {
    if (this.isConnected) {
      this.emit("ping");
    }
  }

  startKeepAlive(interval = 30000): ReturnType<typeof setInterval> | null {
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
    }

    this.keepAliveIntervalId = setInterval(() => {
      this.ping();
    }, interval);

    return this.keepAliveIntervalId;
  }

  private setupEventHandlers(): void {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !this.isConnected) {
        this.connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
  }
}

export const socketService = new SocketService();
