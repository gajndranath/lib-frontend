import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  HelpCircle,
  Home,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { useUIStore } from "@/store/ui.store";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { admin, logout } = useAuthStore();
  const { sidebarOpen, mobileView, closeSidebar } = useUIStore();
  const { unreadCount } = useNotifications();
  const [expandedSection, setExpandedSection] = useState<string>("");

  const navItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
      roles: ["SUPER_ADMIN", "STAFF"] as const,
    },
    {
      title: "Students",
      icon: Users,
      path: "/students",
      roles: ["SUPER_ADMIN", "STAFF"] as const,
      subItems:
        admin?.role === "SUPER_ADMIN"
          ? [
              { title: "All Students", path: "/students" },
              { title: "Add Student", path: "/students/add" },
              { title: "Active Students", path: "/students?status=ACTIVE" },
              { title: "Archived", path: "/students?status=ARCHIVED" },
            ]
          : [
              { title: "All Students", path: "/students" },
              { title: "Active Students", path: "/students?status=ACTIVE" },
            ],
    },
    {
      title: "Payments",
      icon: IndianRupee,
      path: "/payments",
      roles: ["SUPER_ADMIN", "STAFF"] as const,
      subItems:
        admin?.role === "SUPER_ADMIN"
          ? [
              { title: "Current Month", path: "/payments" },
              { title: "Payment History", path: "/payments/history" },
              { title: "Pending Payments", path: "/payments?status=UNPAID" },
              { title: "Receipts", path: "/payments/receipts" },
            ]
          : [
              { title: "Current Month", path: "/payments" },
              { title: "Payment History", path: "/payments/history" },
            ],
    },
    {
      title: "Reports",
      icon: BarChart3,
      path: "/reports",
      roles: ["SUPER_ADMIN", "STAFF"] as const,
      subItems: [
        { title: "Monthly Report", path: "/reports?type=monthly" },
        { title: "Yearly Report", path: "/reports?type=yearly" },
        { title: "Student Report", path: "/reports?type=student" },
        { title: "Collection Report", path: "/reports?type=collection" },
      ],
    },
  ];

  const systemItems = [
    {
      title: "Settings",
      icon: Settings,
      path: "/settings",
      roles: ["SUPER_ADMIN", "STAFF"] as const,
      subItems:
        admin?.role === "SUPER_ADMIN"
          ? [
              { title: "Profile", path: "/settings#profile" },
              { title: "Notifications", path: "/settings#notifications" },
              { title: "Security", path: "/settings#security" },
              { title: "System Settings", path: "/settings#system" },
            ]
          : [
              { title: "Profile", path: "/settings#profile" },
              { title: "Notifications", path: "/settings#notifications" },
            ],
    },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  const toggleSection = (title: string) => {
    setExpandedSection(expandedSection === title ? "" : title);
  };

  const handleNavigation = () => {
    if (mobileView) {
      closeSidebar();
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  const canAccess = (roles: readonly string[]) => {
    return roles.includes(admin?.role || "");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileView && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-gray-900 text-white z-50 transition-all duration-300 ease-in-out flex flex-col",
          "w-64",
          mobileView
            ? sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
            : sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0 md:w-20"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div
              className={cn(
                "flex items-center gap-3",
                !sidebarOpen && "md:justify-center"
              )}
            >
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Home className="h-6 w-6" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold">Library Pro</h1>
                  <p className="text-xs text-gray-400">Management System</p>
                </div>
              )}
            </div>

            {mobileView && (
              <Button
                variant="ghost"
                size="icon"
                onClick={closeSidebar}
                className="text-white hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-gray-800">
          <div
            className={cn(
              "flex items-center gap-3",
              !sidebarOpen && "md:justify-center"
            )}
          >
            <div className="relative">
              <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <UserCog className="h-5 w-5" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>

            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{admin?.username}</p>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-gray-400" />
                  <p className="text-xs text-gray-400 capitalize">
                    {admin?.role?.toLowerCase().replace("_", " ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="px-2 space-y-1">
            {/* Dashboard */}
            <Link
              to="/dashboard"
              onClick={handleNavigation}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive("/dashboard")
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-gray-800 text-gray-300"
              )}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>Dashboard</span>}
            </Link>

            {/* Navigation Items */}
            {navItems.map((item) => {
              if (!canAccess(item.roles)) return null;

              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isItemActive = isActive(item.path);
              const isExpanded = expandedSection === item.title;

              return (
                <div key={item.title}>
                  {hasSubItems ? (
                    <>
                      <button
                        onClick={() => toggleSection(item.title)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors",
                          isItemActive || isExpanded
                            ? "bg-gray-800 text-white"
                            : "hover:bg-gray-800 text-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {sidebarOpen && <span>{item.title}</span>}
                        </div>
                        {sidebarOpen && (
                          <svg
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        )}
                      </button>

                      {sidebarOpen && isExpanded && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.subItems?.map((subItem) => (
                            <Link
                              key={subItem.title}
                              to={subItem.path}
                              onClick={handleNavigation}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                                location.pathname === subItem.path ||
                                  location.search.includes(
                                    subItem.path.split("?")[1] || ""
                                  )
                                  ? "bg-indigo-900/50 text-indigo-300"
                                  : "hover:bg-gray-800/50 text-gray-400"
                              )}
                            >
                              <span className="h-1 w-1 rounded-full bg-current"></span>
                              {subItem.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={handleNavigation}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isItemActive
                          ? "bg-indigo-600 text-white"
                          : "hover:bg-gray-800 text-gray-300"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && <span>{item.title}</span>}
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>

          {/* System Section */}
          <div className="px-4 mt-8 mb-4">
            {sidebarOpen && (
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                System
              </p>
            )}
          </div>

          <nav className="px-2 space-y-1">
            {systemItems.map((item) => {
              if (!canAccess(item.roles)) return null;

              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isItemActive = isActive(item.path);
              const isExpanded = expandedSection === item.title;

              return (
                <div key={item.title}>
                  {hasSubItems ? (
                    <>
                      <button
                        onClick={() => toggleSection(item.title)}
                        className={cn(
                          "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors",
                          isItemActive || isExpanded
                            ? "bg-gray-800 text-white"
                            : "hover:bg-gray-800 text-gray-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          {sidebarOpen && <span>{item.title}</span>}
                        </div>
                        {sidebarOpen && (
                          <svg
                            className={cn(
                              "h-4 w-4 transition-transform",
                              isExpanded && "rotate-180"
                            )}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        )}
                      </button>

                      {sidebarOpen && isExpanded && (
                        <div className="ml-8 mt-1 space-y-1">
                          {item.subItems?.map((subItem) => (
                            <Link
                              key={subItem.title}
                              to={subItem.path}
                              onClick={handleNavigation}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                                location.hash === subItem.path.split("#")[1]
                                  ? "bg-indigo-900/50 text-indigo-300"
                                  : "hover:bg-gray-800/50 text-gray-400"
                              )}
                            >
                              <span className="h-1 w-1 rounded-full bg-current"></span>
                              {subItem.title}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={item.path}
                      onClick={handleNavigation}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        isItemActive
                          ? "bg-indigo-600 text-white"
                          : "hover:bg-gray-800 text-gray-300"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {sidebarOpen && <span>{item.title}</span>}
                    </Link>
                  )}
                </div>
              );
            })}

            {/* Notifications Link */}
            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                // Toggle notifications panel
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors"
            >
              <div className="relative">
                <Bell className="h-5 w-5 flex-shrink-0" />
                {unreadCount > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs border-2 border-gray-900"
                    variant="destructive"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </div>
              {sidebarOpen && <span>Notifications</span>}
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          {/* Quick Stats */}
          {sidebarOpen && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Active Students</span>
                <span className="font-medium">42</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Today's Collection</span>
                <span className="font-medium text-green-400">₹5,200</span>
              </div>
            </div>
          )}

          {/* Help & Logout */}
          <div className="space-y-2">
            {sidebarOpen && (
              <Link
                to="/help"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors text-sm"
              >
                <HelpCircle className="h-4 w-4" />
                <span>Help & Support</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-900/30 text-red-400 transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>Logout</span>}
            </button>
          </div>

          {/* Version */}
          {sidebarOpen && (
            <div className="pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-500 text-center">
                v1.0.0 • {new Date().getFullYear()}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile sidebar toggle button */}
      {!sidebarOpen && mobileView && (
        <button
          onClick={() => useUIStore.getState().openSidebar()}
          className="fixed top-4 left-4 z-40 p-2 bg-gray-900 text-white rounded-lg md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      )}
    </>
  );
};
