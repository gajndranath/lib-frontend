import { type ReactNode, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { adminApi } from "@/api/admin.api";
import { socketService } from "@/api/socket.service";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { setLoading, setAuth, clearAuth, isLoading, accessToken, admin } =
    useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(
    useAuthStore.persist.hasHydrated(),
  );
  const lastValidatedKey = useRef<string | null>(null);
  const socketConnectedKey = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const currentKey =
      accessToken && admin?._id ? `${accessToken}:${admin._id}` : null;

    if (currentKey && lastValidatedKey.current === currentKey) {
      return;
    }

    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Check Zustand store for persisted auth data
        if (!accessToken || !admin) {
          console.log("No token or admin in store");
          setInitialized(true);
          return;
        }

        try {
          // Validate token by fetching profile
          const { data, error } = await adminApi.getProfile();

          if (error) {
            console.log("Token validation failed:", error);
            // Keep session until manual logout
            setInitialized(true);
            return;
          }

          if (data?.data) {
            console.log("Token valid, refreshing auth");
            // Avoid unnecessary state updates
            if (admin._id !== data.data._id) {
              setAuth(data.data, accessToken);
            }

            lastValidatedKey.current = `${accessToken}:${data.data._id}`;

            // Connect socket
            if (socketConnectedKey.current !== accessToken) {
              socketService.connect(accessToken, data.data._id, data.data.role);
              socketConnectedKey.current = accessToken;
            }
          }
        } catch (error) {
          console.error("Error validating token:", error);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        console.log("Auth initialization complete");
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [hasHydrated, accessToken, admin, setLoading, setAuth, clearAuth]);

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
