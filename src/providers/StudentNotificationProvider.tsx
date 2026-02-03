import { type ReactNode, useEffect, useState } from "react";
import { useNotificationStore } from "@/store/notification.store";
import { studentAuthApi } from "@/api/studentAuth.api";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { useStudentWebPush } from "@/hooks/useStudentWebPush";
import { useStudentSocket } from "@/hooks/useStudentSocket";

export const StudentNotificationProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { student, isAuthenticated } = useStudentAuthStore();
  const { setNotifications, setUnreadCount } = useNotificationStore();
  const { checkPermission, getSubscription, subscribe, subscription } =
    useStudentWebPush();
  const [initialized, setInitialized] = useState(false);
  useStudentSocket(); // Connect student socket

  // Load notifications when authenticated
  useEffect(() => {
    if (isAuthenticated && student) {
      const loadNotifications = async () => {
        try {
          const { data } = await studentAuthApi.getNotifications({
            limit: 20,
            unreadOnly: false,
          });

          if (data?.data) {
            setNotifications(data.data.notifications);
            setUnreadCount(data.data.unreadCount);
          }
        } catch (error) {
          console.error("Failed to load student notifications:", error);
        } finally {
          setInitialized(true);
        }
      };

      loadNotifications();
    } else {
      setInitialized(true);
    }
  }, [isAuthenticated, student, setNotifications, setUnreadCount]);

  // Initialize push notifications for students
  useEffect(() => {
    if (initialized && isAuthenticated && student) {
      checkPermission();
      getSubscription();

      if ("Notification" in window && Notification.permission !== "denied") {
        if (!subscription) {
          subscribe();
        }
      }
    }
  }, [
    initialized,
    isAuthenticated,
    student,
    checkPermission,
    getSubscription,
    subscribe,
    subscription,
  ]);

  if (!initialized) {
    return null;
  }

  return <>{children}</>;
};
