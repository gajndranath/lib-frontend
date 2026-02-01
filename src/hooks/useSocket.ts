import { useEffect, useCallback } from "react";
import { socketService } from "@/api/socket.service";
import { useNotificationStore } from "@/store/notification.store";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import type { Notification } from "@/types";

export const useSocket = () => {
  const { admin, accessToken, isAuthenticated } = useAuthStore();
  const { addNotification, markAsRead } = useNotificationStore();

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && admin && accessToken) {
      const socket = socketService.connect(accessToken, admin._id, admin.role);

      // Setup event listeners
      socket.on("notification", (notification: Notification) => {
        addNotification(notification);

        // Show toast for important notifications
        if (!notification.read && notification.priority === "URGENT") {
          toast.error(notification.title, {
            description: notification.message,
            duration: 10000,
          });
        } else if (!notification.read) {
          toast.info(notification.title, {
            description: notification.message,
            duration: 5000,
          });
        }
      });

      socket.on("payment_sync", (data) => {
        toast.success("Payment Updated", {
          description: `${data.studentName} - ₹${data.amount}`,
        });
      });

      socket.on("new_student", (data) => {
        toast.info("New Student Registered", {
          description: `${data.name} added to ${data.slotName}`,
        });
      });

      socket.on("reminder_alert", (data) => {
        toast.warning("Reminder Triggered", {
          description: `${data.count} reminders sent`,
        });
      });

      socket.on("connected", (data) => {
        console.log("Socket connected:", data.message);
      });

      socket.on("system_status", (data) => {
        console.log("System status:", data);
      });

      // Cleanup on unmount
      return () => {
        socket.off("notification");
        socket.off("payment_sync");
        socket.off("new_student");
        socket.off("reminder_alert");
        socket.off("connected");
        socket.off("system_status");
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, admin, accessToken, addNotification]);

  // Emit events
  const emitPaymentUpdate = useCallback(
    (data: { studentName: string; amount: number }) => {
      socketService.emit("payment_updated", data);
    },
    [],
  );

  const emitStudentAdded = useCallback(
    (data: { name: string; slotName: string }) => {
      socketService.emit("student_added", data);
    },
    [],
  );

  const emitFeeStatusChanged = useCallback((data: Record<string, unknown>) => {
    socketService.emit("fee_status_changed", data);
  }, []);

  const emitReminderTriggered = useCallback((data: { count: number }) => {
    socketService.emit("reminder_triggered", data);
  }, []);

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      socketService.emit("mark_notification_read", notificationId);
      markAsRead(notificationId);
    },
    [markAsRead],
  );

  const ping = useCallback(() => {
    socketService.emit("ping");
  }, []);

  return {
    isConnected: socketService.isConnected(),
    socketId: socketService.getId(),
    emitPaymentUpdate,
    emitStudentAdded,
    emitFeeStatusChanged,
    emitReminderTriggered,
    markNotificationRead,
    ping,
  };
};
