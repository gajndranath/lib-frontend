import { useEffect, useState } from "react";
import { socketService } from "@/services/socket.service";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "sonner";
import { useNotificationStore } from "@/store/notification.store";
import type {
  SocketPaymentSyncData,
  SocketNewStudentData,
  SocketAdminConnectionData,
  NotificationData,
  PaymentStatus,
} from "@/types/api.types";
import { NotificationType } from "@/types/api.types";

interface PaymentSyncData extends SocketPaymentSyncData {
  updatedBy: string;
}

interface NewStudentData extends SocketNewStudentData {
  addedBy: string;
}

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [connectedAdmins, setConnectedAdmins] = useState(0);
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    // Connection status
    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(socketService.getSocketId());
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketId(null);
    };

    // Dashboard updates
    const handleDashboardUpdate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.analytics.dashboard,
      });
    };

    // Payment sync
    const handlePaymentSync = (data: PaymentSyncData) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.dashboard(data.month, data.year),
      });

      if (data.updatedBy !== socketId) {
        toast.info("Payment Updated", {
          description: `${data.studentName} marked as ${data.status} by ${data.updatedBy}`,
        });
      }
    };

    // New student added
    const handleNewStudent = (data: NewStudentData) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });

      if (data.addedBy !== socketId) {
        toast.info("New Student Added", {
          description: `${data.studentName} added by ${data.addedBy}`,
        });

        addNotification({
          id: Date.now().toString(),
          title: "New Student Added",
          body: `${data.studentName} added to the system`,
          type: NotificationType.STUDENT_ADDED,
          data: { studentId: data.studentId, studentName: data.studentName },
          timestamp: new Date().toISOString(),
        });
      }
    };

    // Connected users count
    const handleConnectedUsers = (data: { adminCount: number }) => {
      setConnectedAdmins(data.adminCount);
    };

    // Admin connected/disconnected
    const handleAdminConnected = (data: SocketAdminConnectionData) => {
      if (data.adminId !== socketId) {
        toast.info("Admin Connected", {
          description: "Another admin is now online",
        });
      }
    };

    const handleAdminDisconnected = () => {
      toast.info("Admin Disconnected", {
        description: "An admin has gone offline",
      });
    };

    // Register listeners
    socketService.on("connect", handleConnect);
    socketService.on("disconnect", handleDisconnect);
    socketService.on("dashboard_updated", handleDashboardUpdate);
    socketService.on("payment_sync", handlePaymentSync);
    socketService.on("new_student", handleNewStudent);
    socketService.on("connected_users", handleConnectedUsers);
    socketService.on("admin_connected", handleAdminConnected);
    socketService.on("admin_disconnected", handleAdminDisconnected);

    // Start keep-alive ping
    const keepAliveInterval = socketService.startKeepAlive();

    return () => {
      // Cleanup
      socketService.off("connect", handleConnect);
      socketService.off("disconnect", handleDisconnect);
      socketService.off("dashboard_updated", handleDashboardUpdate);
      socketService.off("payment_sync", handlePaymentSync);
      socketService.off("new_student", handleNewStudent);
      socketService.off("connected_users", handleConnectedUsers);
      socketService.off("admin_connected", handleAdminConnected);
      socketService.off("admin_disconnected", handleAdminDisconnected);

      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
      }
    };
  }, [queryClient, socketId, addNotification]);

  // Emit payment update
  const emitPaymentUpdate = (data: {
    studentId: string;
    month: number;
    year: number;
    status: PaymentStatus;
    amount?: number;
    updatedBy: string;
  }) => {
    socketService.emit("payment_updated", data);
  };

  // Emit dashboard sync
  const emitDashboardSync = (month: number, year: number) => {
    socketService.emit("sync_dashboard", { month, year });
  };

  // Send notification
  const sendNotification = (notification: NotificationData) => {
    socketService.emit("send_notification", notification);
  };

  return {
    isConnected,
    socketId,
    connectedAdmins,
    emitPaymentUpdate,
    emitDashboardSync,
    sendNotification,
    connect: () => socketService.connect(),
    disconnect: () => socketService.disconnect(),
    isSocketConnected: () => socketService.isSocketConnected(),
  };
};
