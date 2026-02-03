import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/api/socket.service";
import { useNotificationStore } from "@/store/notification.store";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";
import type { Notification } from "@/types";

export const useSocket = () => {
  const { admin, accessToken, isAuthenticated } = useAuthStore();
  const { addNotification, markAsRead } = useNotificationStore();
  const queryClient = useQueryClient();

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && admin && accessToken) {
      const socket = socketService.connect(accessToken, admin._id, admin.role);

      // ✅ RULE: Define handlers OUTSIDE useEffect to avoid re-registration
      // This prevents listener accumulation on re-renders
      const handleNotification = (notification: Notification) => {
        addNotification(notification);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });

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
      };

      const handlePaymentSync = (data: {
        studentName: string;
        amount: number;
      }) => {
        toast.success("Payment Updated", {
          description: `${data.studentName} - ₹${data.amount}`,
        });
      };

      const handleNewStudent = (data: { name: string; slotName: string }) => {
        toast.info("New Student Registered", {
          description: `${data.name} added to ${data.slotName}`,
        });
      };

      const handleReminderAlert = (data: { count: number }) => {
        toast.warning("Reminder Triggered", {
          description: `${data.count} reminders sent`,
        });
      };

      const handleConnected = (data: { message: string }) => {
        console.log("Socket connected:", data.message);
      };

      const handleSystemStatus = (data: unknown) => {
        console.log("System status:", data);
      };

      // ✅ Register all listeners ONCE
      socket.on("notification", handleNotification);
      socket.on("payment_sync", handlePaymentSync);
      socket.on("new_student", handleNewStudent);
      socket.on("reminder_alert", handleReminderAlert);
      socket.on("connected", handleConnected);
      socket.on("system_status", handleSystemStatus);

      // ✅ Comprehensive cleanup on unmount
      return () => {
        // Remove all listeners to prevent accumulation
        socket.off("notification", handleNotification);
        socket.off("payment_sync", handlePaymentSync);
        socket.off("new_student", handleNewStudent);
        socket.off("reminder_alert", handleReminderAlert);
        socket.off("connected", handleConnected);
        socket.off("system_status", handleSystemStatus);

        // Disconnect socket
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, admin, accessToken, addNotification, queryClient]);

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
