import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notificationApi } from "@/api/notifications.api";
import { useToast } from "@/hooks/useToast";
import { useNotificationStore } from "@/store/notification.store";
import { formatRelativeTime } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  PAYMENT_REMINDER: <AlertCircle className="h-4 w-4" />,
  FEE_ALERT: <AlertCircle className="h-4 w-4" />,
  SLOT_UPDATE: <Info className="h-4 w-4" />,
  ADMIN_ALERT: <AlertCircle className="h-4 w-4" />,
  SYSTEM: <Info className="h-4 w-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  PAYMENT_REMINDER: "bg-yellow-100 text-yellow-800",
  FEE_ALERT: "bg-red-100 text-red-800",
  SLOT_UPDATE: "bg-blue-100 text-blue-800",
  ADMIN_ALERT: "bg-orange-100 text-orange-800",
  SYSTEM: "bg-gray-100 text-gray-800",
};

export const Notifications: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { notifications, setNotifications } = useNotificationStore();

  // Fetch notifications
  const { isLoading: isLoadingNotifs, refetch } = useQuery({
    queryKey: ["notifications", searchTerm, typeFilter, statusFilter],
    queryFn: async () => {
      try {
        const { data, error } = await notificationApi.getNotificationHistory({
          search: searchTerm,
          type: typeFilter !== "all" ? typeFilter : undefined,
          unreadOnly: statusFilter === "unread",
          limit: 100,
        });
        if (error) throw error;
        const notifs = data?.data?.notifications || [];
        setNotifications(notifs);
        return notifs;
      } catch (error: unknown) {
        const msg =
          error instanceof Error
            ? error.message
            : "Failed to fetch notifications";
        toast.error(msg);
        throw error;
      }
    },
  });

  // Mark as read mutation
  const { mutate: markAsRead, isPending: isMarkingRead } = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await notificationApi.markAsRead(notificationId);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Marked as read");
    },
    onError: (error: Error) => {
      toast.error((error as Error)?.message || "Failed to mark as read");
    },
  });

  // Mark all as read mutation
  const { mutate: markAllAsRead, isPending: isMarkingAllRead } = useMutation({
    mutationFn: async () => {
      const { data, error } = await notificationApi.markAllAsRead();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: (error: Error) => {
      toast.error((error as Error)?.message || "Failed to mark all as read");
    },
  });

  // Delete notification mutation
  const { mutate: deleteNotif } = useMutation({
    mutationFn: async (notificationId: string) => {
      // Simulate delete since backend might not have explicit delete
      setNotifications(notifications.filter((n) => n._id !== notificationId));
      return null;
    },
    onSuccess: () => {
      toast.success("Notification deleted");
    },
  });

  // Filter notifications
  const filteredNotifications = notifications.filter((notif) => {
    const matchesSearch =
      notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "all" || notif.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "unread" && !notif.read);

    return matchesSearch && matchesType && matchesStatus;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAllRead || unreadCount === 0}
          >
            Mark all as read
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoadingNotifs}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoadingNotifs ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="PAYMENT_REMINDER">
                    Payment Reminder
                  </SelectItem>
                  <SelectItem value="FEE_ALERT">Fee Alert</SelectItem>
                  <SelectItem value="SLOT_UPDATE">Slot Update</SelectItem>
                  <SelectItem value="ADMIN_ALERT">Admin Alert</SelectItem>
                  <SelectItem value="SYSTEM">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
          <CardDescription>
            Total: {filteredNotifications.length} notification
            {filteredNotifications.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingNotifs ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">No notifications found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-4 rounded-lg border transition-colors ${
                    !notif.read
                      ? "bg-blue-50 border-blue-200"
                      : "bg-muted/50 border-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={TYPE_COLORS[notif.type]}>
                          {TYPE_ICONS[notif.type]}
                          <span className="ml-1">{notif.type}</span>
                        </Badge>
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <h4 className="font-semibold text-sm mb-1">
                        {notif.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(notif.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notif.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notif._id)}
                          disabled={isMarkingRead}
                          title="Mark as read"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotif(notif._id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
