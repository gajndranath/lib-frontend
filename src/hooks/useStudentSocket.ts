import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/api/socket.service";
import { useNotificationStore } from "@/store/notification.store";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { toast } from "sonner";
import type { Notification } from "@/types";

export const useStudentSocket = () => {
  const { student, accessToken, isAuthenticated } = useStudentAuthStore();
  const { addNotification, markAsRead } = useNotificationStore();
  const queryClient = useQueryClient();

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && student && accessToken) {
      const socket = socketService.connectStudent(accessToken, student._id);

      // Setup event listeners
      socket.on("notification", (notification: Notification) => {
        console.log("Student received notification:", notification);
        addNotification(notification);

        queryClient.invalidateQueries({
          queryKey: ["student-notifications"],
        });
        queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });

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

        // Try to show browser notification if permission granted
        if (
          "Notification" in window &&
          Notification.permission === "granted" &&
          !notification.read
        ) {
          new Notification(notification.title, {
            body: notification.message,
            icon: "/vite.svg",
            badge: "/vite.svg",
            tag: `notification-${notification._id}`,
            data: notification.data,
          });
        }
      });

      socket.on("payment_received", (data) => {
        toast.success("Payment Confirmed", {
          description: `Your payment of ₹${data.amount} has been received`,
          duration: 10000,
        });
      });

      socket.on("fee_update", (data) => {
        console.log("Fee update:", data);
      });

      socket.on("connected", (data) => {
        console.log("Student socket connected:", data.message);
      });

      // Cleanup on unmount
      return () => {
        socket.off("notification");
        socket.off("payment_received");
        socket.off("fee_update");
        socket.off("connected");
        socketService.disconnect();
      };
    }
  }, [isAuthenticated, student, accessToken, addNotification, queryClient]);

  // Emit events
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
    markNotificationRead,
    ping,
  };
};
