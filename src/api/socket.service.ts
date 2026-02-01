import { io, Socket } from "socket.io-client";
import type { SocketEvents } from "@/types";

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token: string, adminId: string, role: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "ws://lib-backend-j0e9.onrender.com";

    this.socket = io(socketUrl, {
      auth: {
        token,
        adminId,
        role,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000,
    });

    this.setupEventListeners();

    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.reconnectAttempts++;
    });

    this.socket.on("reconnect_attempt", (attempt) => {
      console.log("Reconnect attempt:", attempt);
    });

    this.socket.on("reconnect_failed", () => {
      console.error("Socket reconnection failed");
    });
  }

  on<T extends keyof SocketEvents>(event: T, callback: SocketEvents[T]): void {
    this.socket?.on(event as string, callback as (...args: unknown[]) => void);
  }

  off<T extends keyof SocketEvents>(
    event: T,
    callback?: SocketEvents[T],
  ): void {
    if (callback) {
      this.socket?.off(
        event as string,
        callback as (...args: unknown[]) => void,
      );
    } else {
      this.socket?.off(event as string);
    }
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }

  // Optional: Type-safe emit with generic
  emitSafe<T extends keyof SocketEvents>(
    event: T,
    ...args: Parameters<SocketEvents[T]>
  ): void {
    this.socket?.emit(event as string, ...args);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getId(): string | undefined {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
