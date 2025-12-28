import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useUIStore } from "@/store/ui.store";
import { useSocket } from "@/hooks/useSocket";
import { useNotifications } from "@/hooks/useNotifications";

export const Layout: React.FC = () => {
  const { sidebarOpen, mobileView, setMobileView } = useUIStore();
  const { isConnected } = useSocket();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  // Handle mobile view detection
  useEffect(() => {
    const handleResize = () => {
      setMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [setMobileView]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (mobileView) {
      useUIStore.getState().closeSidebar();
    }
  }, [location.pathname, mobileView]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Connection Status Bar */}
      {!isConnected && (
        <div className="bg-yellow-500 text-white text-center py-1 text-sm">
          <span className="animate-pulse">⚡</span> Connecting to server...
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen && !mobileView ? "md:ml-64" : ""
          }`}
        >
          <Header unreadCount={unreadCount} />

          <main className="p-4 md:p-6">
            <Outlet />
          </main>

          {/* Footer */}
          <footer className="border-t bg-white p-4 text-center text-sm text-gray-500">
            <div className="container mx-auto">
              <p>
                Library Management System v1.0 • {new Date().getFullYear()} •
                All rights reserved
              </p>
              <p className="mt-1">
                {isConnected ? "🟢 Connected" : "🔴 Disconnected"} •
                Notifications: {unreadCount} unread
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
