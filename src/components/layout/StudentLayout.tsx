import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { StudentNotificationProvider } from "@/providers/StudentNotificationProvider";
import {
  Home,
  User,
  Receipt,
  Bell,
  LogOut,
  MessageSquare,
  Megaphone,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "@/store/notification.store";
import { initCrypto, getOrCreateKeyPair } from "@/lib/crypto";
import { studentChatApi } from "@/api/studentChat.api";
import { cn } from "@/lib/utils";

const StudentLayoutContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { student, isAuthenticated, clearAuth } = useStudentAuthStore();
  const { unreadCount } = useNotificationStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isChatPage = location.pathname === "/student/chat";

  useEffect(() => {
    if (!isAuthenticated) return;
    const ensureKeys = async () => {
      try {
        await initCrypto();
        const keypair = await getOrCreateKeyPair();
        await studentChatApi.setPublicKey(keypair.publicKey);
      } catch (error) {
        console.error("Failed to sync student public key", error);
      }
    };
    void ensureKeys();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/student/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("studentAccessToken");
    localStorage.removeItem("student");
    clearAuth();
    navigate("/student/login");
  };

  const navItems = [
    { path: "/student/dashboard", icon: Home, label: "Dashboard" },
    { path: "/student/profile", icon: User, label: "Profile" },
    { path: "/student/payments", icon: Receipt, label: "Payments" },
    {
      path: "/student/notifications",
      icon: Bell,
      label: "Notifications",
      badge: unreadCount,
    },
    { path: "/student/chat", icon: MessageSquare, label: "Chat" },
    { path: "/student/announcements", icon: Megaphone, label: "Announcements" },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Left: Logo + Menu (mobile) */}
          <div className="flex items-center gap-3">
            {isChatPage ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">LS</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Library System
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {student?.name}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            )}

            {isChatPage ? (
              <Sheet>
                <SheetTrigger
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-blue-50"
                  title="Menu"
                >
                  <Menu className="h-5 w-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-white">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Navigation
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="space-y-1">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Button
                          key={item.path}
                          variant={isActive ? "default" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3 h-11 hover:bg-blue-50",
                            isActive &&
                              "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
                          )}
                          onClick={() => navigate(item.path)}
                        >
                          <Icon className="h-5 w-5" />
                          {item.label}
                          {item.badge && item.badge > 0 && (
                            <Badge
                              className={cn(
                                "ml-auto",
                                isActive
                                  ? "bg-white text-blue-600"
                                  : "bg-red-500",
                              )}
                            >
                              {item.badge > 9 ? "9+" : item.badge}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </nav>
                </SheetContent>
              </Sheet>
            ) : (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">LS</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Library System
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {student?.name}
                  </p>
                </div>
              </div>
            )}

            {isChatPage && (
              <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">
                  Messages
                </span>
              </div>
            )}
          </div>

          {/* Right: Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="flex relative">
        {/* Desktop Sidebar */}
        {!isChatPage && (
          <aside className="hidden lg:flex w-64 border-r bg-white/50 backdrop-blur h-[calc(100vh-4rem)] sticky top-16 flex-col">
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-11 transition-all",
                      isActive &&
                        "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md",
                      !isActive && "hover:bg-blue-50",
                    )}
                    onClick={() => navigate(item.path)}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge
                        className={cn(
                          "ml-auto",
                          isActive ? "bg-white text-blue-600" : "bg-red-500",
                        )}
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </nav>
            <div className="p-4 border-t bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="text-xs text-muted-foreground text-center">
                © 2026 Library System
              </div>
            </div>
          </aside>
        )}

        {/* Mobile Sidebar Overlay */}
        {!isChatPage && sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          >
            <aside
              className="fixed left-0 top-16 bottom-0 w-72 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="p-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Button
                      key={item.path}
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 h-11",
                        isActive &&
                          "bg-gradient-to-r from-blue-600 to-indigo-600 text-white",
                      )}
                      onClick={() => handleNavigate(item.path)}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <Badge
                          className={cn(
                            "ml-auto",
                            isActive ? "bg-white text-blue-600" : "bg-red-500",
                          )}
                        >
                          {item.badge > 9 ? "9+" : item.badge}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main
          className={cn(
            "flex-1 min-h-[calc(100vh-4rem)]",
            !isChatPage && "pb-20 lg:pb-0",
          )}
        >
          <Outlet />
        </main>
      </div>

      {/* Modern Mobile Bottom Nav */}
      {!isChatPage && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t shadow-lg z-40">
          <div className="grid grid-cols-5 gap-1 p-2">
            {navItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex-col h-auto py-2 px-1 relative",
                    isActive && "text-blue-600",
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <Icon
                    className={cn("h-5 w-5", isActive && "fill-blue-600/20")}
                  />
                  <span className="text-[10px] mt-1 font-medium">
                    {item.label}
                  </span>
                  {item.badge && item.badge > 0 && (
                    <Badge
                      className="absolute -top-1 right-1 h-4 w-4 p-0 flex items-center justify-center text-[8px]"
                      variant="destructive"
                    >
                      {item.badge > 9 ? "9+" : item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </nav>
      )}
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
