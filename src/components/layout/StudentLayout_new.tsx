import { Outlet, Navigate } from "react-router-dom";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { StudentNotificationProvider } from "@/providers/StudentNotificationProvider";
import { Home, User, Receipt, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "@/store/notification.store";

const StudentLayoutContent = () => {
  const navigate = useNavigate();
  const { student, isAuthenticated, clearAuth } = useStudentAuthStore();
  const { unreadCount } = useNotificationStore();

  if (!isAuthenticated) {
    return <Navigate to="/student/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("studentAccessToken");
    localStorage.removeItem("student");
    clearAuth();
    navigate("/student/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-base">LS</span>
            </div>
            <div>
              <h1 className="font-semibold text-lg">Library System</h1>
              <p className="text-xs text-muted-foreground">
                Welcome, {student?.name}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-64 border-r bg-white h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-2">
            <Button
              variant={
                window.location.pathname === "/student/dashboard"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start"
              onClick={() => navigate("/student/dashboard")}
            >
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={
                window.location.pathname === "/student/profile"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start"
              onClick={() => navigate("/student/profile")}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Button>
            <Button
              variant={
                window.location.pathname === "/student/payments"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start"
              onClick={() => navigate("/student/payments")}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Payments
            </Button>
            <Button
              variant={
                window.location.pathname === "/student/notifications"
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start relative"
              onClick={() => navigate("/student/notifications")}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="ml-auto" variant="destructive">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="flex justify-around p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/student/dashboard")}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/student/profile")}
          >
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Profile</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-2"
            onClick={() => navigate("/student/payments")}
          >
            <Receipt className="h-5 w-5" />
            <span className="text-xs mt-1">Payments</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-col h-auto py-2 relative"
            onClick={() => navigate("/student/notifications")}
          >
            <Bell className="h-5 w-5" />
            <span className="text-xs mt-1">Alerts</span>
            {unreadCount > 0 && (
              <Badge
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                variant="destructive"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      </nav>
    </div>
  );
};

export const StudentLayout = () => {
  return (
    <StudentNotificationProvider>
      <StudentLayoutContent />
    </StudentNotificationProvider>
  );
};
