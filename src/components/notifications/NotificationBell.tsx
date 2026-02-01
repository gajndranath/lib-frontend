import React, { useState, useMemo, useCallback } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationStore } from "@/store/notification.store";
import { useNotifications } from "@/hooks/useNotifications";
import { formatRelativeTime } from "@/lib/utils";
import type { NotificationType } from "@/types";
import { useNavigate } from "react-router-dom";

export const NotificationBell: React.FC = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount } = useNotificationStore();
  const { markAsRead, markAllAsRead, clearAll, refresh } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const unreadCountMemo = useMemo(() => unreadCount, [unreadCount]);

  const getNotificationDotColor = useCallback((type: NotificationType) => {
    const colors: Record<NotificationType, string> = {
      PAYMENT_REMINDER: "bg-yellow-500",
      PAYMENT_CONFIRMATION: "bg-green-500",
      OVERDUE_ALERT: "bg-red-500",
      STUDENT_REGISTRATION: "bg-blue-500",
      SLOT_CHANGE: "bg-purple-500",
      FEE_OVERRIDE: "bg-amber-500",
      SYSTEM_ALERT: "bg-gray-500",
      TEST: "bg-gray-400",
    };
    return colors[type] ?? "bg-gray-400";
  }, []);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open) {
      try {
        await refresh({ limit: 20, unreadOnly: false });
      } catch (error) {
        console.error("Failed to refresh notifications:", error);
      }
    }
  };

  if (!admin) return null;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCountMemo > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCountMemo}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-white" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Notifications</div>
          <div className="flex gap-2">
            {unreadCountMemo > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="text-xs h-8"
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAll()}
                className="text-xs h-8"
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You're all caught up!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    !notification.read ? "bg-muted/30" : ""
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification._id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-2 w-2 rounded-full mt-2 ${getNotificationDotColor(
                        notification.type,
                      )}`}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {notification.title}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <div className="flex justify-end">
                          <span className="text-xs text-primary">New</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t p-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
