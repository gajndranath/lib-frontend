import React from "react";
import { Bell, Menu, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUIStore } from "@/store/ui.store";
import { useAuthStore } from "@/store/auth.store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationList } from "@/components/notifications/NotificationList";

interface HeaderProps {
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({ unreadCount }) => {
  const { toggleSidebar, toggleNotifications, notificationsOpen } =
    useUIStore();
  const { admin, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search..." className="pl-10 w-64" />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={toggleNotifications}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                variant="destructive"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <User className="h-5 w-5" />
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium">{admin?.username}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {admin?.role?.toLowerCase().replace("_", " ")}
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => (window.location.href = "/settings")}
              >
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  (window.location.href = "/settings#notifications")
                }
              >
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  if (confirm("Are you sure you want to logout?")) {
                    logout();
                  }
                }}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Notification Panel */}
      {notificationsOpen && <NotificationList />}
    </header>
  );
};
