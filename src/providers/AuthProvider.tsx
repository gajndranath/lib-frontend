import { type ReactNode, useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { adminApi } from "@/api/admin.api";
import { socketService } from "@/api/socket.service";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { setLoading, setAuth, clearAuth, isLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Check if we have a token
        const token = localStorage.getItem("accessToken");
        const storedAdmin = localStorage.getItem("admin");

        if (!token || !storedAdmin) {
          console.log("No token or admin found");
          clearAuth();
          setInitialized(true);
          return;
        }

        try {
          // Parse stored admin
          const _adminData = JSON.parse(storedAdmin);

          // Validate token by fetching profile
          const { data, error } = await adminApi.getProfile();

          if (error) {
            console.log("Token validation failed:", error);
            if (error.statusCode === 401) {
              clearAuth();
              localStorage.removeItem("accessToken");
              localStorage.removeItem("admin");
            }
            setInitialized(true);
            return;
          }

          if (data?.data) {
            console.log("Token valid, setting auth");
            console.log("Admin data from storage:", _adminData);
            console.log("Admin data from profile fetch:", data.data);
            setAuth(data.data, token);

            // Connect socket
            socketService.connect(token, data.data._id, data.data.role);
          }
        } catch (parseError) {
          console.error("Error parsing stored admin:", parseError);
          clearAuth();
          localStorage.removeItem("admin");
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAuth();
      } finally {
        console.log("Auth initialization complete");
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [setLoading, setAuth, clearAuth]);

  // Show loading while initializing
  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-primary/10 mb-6">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Library Management System
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
