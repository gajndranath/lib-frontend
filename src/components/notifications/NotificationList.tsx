import React from "react";
import { format } from "date-fns";
import {
  Bell,
  AlertCircle,
  IndianRupee,
  Users,
  Calendar,
  X,
  Trash2,
  CheckCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { NotificationType } from "@/types/api.types";
import { useNotificationStore } from "@/store/notification.store";
import { useNotifications } from "@/hooks/useNotifications";
import { useUIStore } from "@/store/ui.store";

// Define a more specific type for notification data in the UI
interface NotificationActionData {
  studentId?: string;
  studentName?: string;
  amount?: number;
  date?: string;
  [key: string]: unknown; // Allow other properties
}

interface UINotification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: NotificationActionData;
  timestamp: string;
  read: boolean;
}

interface NotificationAction {
  label: string;
  action: () => void;
}

export const NotificationList: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    removeNotification,
  } = useNotificationStore();
  const { clearAll: clearAllAPI } = useNotifications();
  const { closeSidebar } = useUIStore();

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.PAYMENT_REMINDER:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case NotificationType.DAILY_SUMMARY:
        return <Bell className="h-5 w-5 text-blue-600" />;
      case NotificationType.PAYMENT_RECEIVED:
        return <IndianRupee className="h-5 w-5 text-green-600" />;
      case NotificationType.STUDENT_ADDED:
        return <Users className="h-5 w-5 text-purple-600" />;
      case NotificationType.SYSTEM_ALERT:
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.PAYMENT_REMINDER:
        return "bg-yellow-50 border-yellow-200";
      case NotificationType.DAILY_SUMMARY:
        return "bg-blue-50 border-blue-200";
      case NotificationType.PAYMENT_RECEIVED:
        return "bg-green-50 border-green-200";
      case NotificationType.STUDENT_ADDED:
        return "bg-purple-50 border-purple-200";
      case NotificationType.SYSTEM_ALERT:
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getNotificationAction = (
    notification: UINotification
  ): NotificationAction => {
    switch (notification.type) {
      case NotificationType.PAYMENT_RECEIVED:
        return {
          label: "View Payment",
          action: () => {
            if (notification.data?.studentId) {
              window.location.href = `/students/${notification.data.studentId}`;
            }
          },
        };
      case NotificationType.STUDENT_ADDED:
        return {
          label: "View Student",
          action: () => {
            if (notification.data?.studentId) {
              window.location.href = `/students/${notification.data.studentId}`;
            }
          },
        };
      case NotificationType.PAYMENT_REMINDER:
        return {
          label: "Mark as Paid",
          action: () => {
            if (notification.data?.studentId) {
              window.location.href = `/payments?student=${notification.data.studentId}`;
            }
          },
        };
      default:
        return {
          label: "View Details",
          action: () => {
            // Default action - could navigate to dashboard or notifications page
            console.log("Default notification action");
          },
        };
    }
  };

  const handleMarkAllAsRead = () => {
    markAsRead();
  };

  const handleClearAll = async () => {
    try {
      await clearAllAPI();
      clearAll();
    } catch (error) {
      console.error("Failed to clear notifications:", error);
    }
  };

  const handleNotificationClick = (notification: UINotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    const action = getNotificationAction(notification);
    action.action();
  };

  if (notifications.length === 0) {
    return (
      <div className="absolute right-0 top-16 w-80 bg-white border rounded-lg shadow-lg z-50">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            <Button variant="ghost" size="icon" onClick={closeSidebar}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
          <h4 className="font-medium text-gray-900 mb-2">No notifications</h4>
          <p className="text-sm text-gray-500">
            You're all caught up! Check back later for updates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute right-0 top-16 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={closeSidebar}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="flex-1"
          >
            <CheckCheck className="h-3 w-3 mr-2" />
            Mark all as read
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="flex-1"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Clear all
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {(notifications as UINotification[]).map((notification) => {
            const action = getNotificationAction(notification);

            return (
              <div
                key={notification.id}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                  getNotificationColor(notification.type),
                  !notification.read && "ring-1 ring-blue-300"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm">
                        {notification.title}
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                        )}
                        <span className="text-xs text-gray-500">
                          {format(new Date(notification.timestamp), "hh:mm a")}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                      {notification.body}
                    </p>

                    {notification.data && (
                      <div className="mt-2 space-y-1">
                        {notification.data.amount && (
                          <div className="flex items-center gap-1 text-sm">
                            <IndianRupee className="h-3 w-3 text-green-600" />
                            <span className="font-medium">
                              {notification.data.amount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}

                        {notification.data.studentName && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Users className="h-3 w-3" />
                            <span>{notification.data.studentName}</span>
                          </div>
                        )}

                        {notification.data.date && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(
                                new Date(notification.data.date),
                                "dd MMM yyyy"
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          action.action();
                        }}
                      >
                        {action.label}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notification.id) {
                              removeNotification(notification.id);
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {notifications.length} notifications
          </div>
          <Button
            variant="link"
            size="sm"
            className="text-blue-600"
            onClick={() => {
              window.location.href = "/settings#notifications";
            }}
          >
            View all
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium">Today</div>
            <div className="text-green-600 font-bold">
              {
                notifications.filter(
                  (n) =>
                    new Date(n.timestamp).toDateString() ===
                    new Date().toDateString()
                ).length
              }
            </div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium">Unread</div>
            <div className="text-blue-600 font-bold">{unreadCount}</div>
          </div>
          <div className="text-center p-2 bg-white rounded border">
            <div className="font-medium">Total</div>
            <div className="text-gray-700 font-bold">
              {notifications.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
