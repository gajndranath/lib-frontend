import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { adminApi } from "@/api/admin.api";
import { socketService } from "@/api/socket.service";
import { clearAllChatKeys } from "@/lib/crypto";
import { toast } from "sonner";

export const useAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { admin, accessToken, setAuth, clearAuth, updateAdmin } =
    useAuthStore();

  // Check auth status on mount
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["profile", accessToken],
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("No access token");
      }

      const { data, error } = await adminApi.getProfile();
      if (error) {
        throw error;
      }
      return data?.data;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Handle authentication errors
  useEffect(() => {
    if (error) {
      console.log("useAuth: Profile fetch error:", error);
    }
  }, [error]);

  // Update store when profile loads
  useEffect(() => {
    if (profile && admin?._id !== profile._id) {
      updateAdmin(profile);
    }
  }, [profile, admin, updateAdmin]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: adminApi.login,
    onSuccess: ({ data }) => {
      if (data?.data) {
        const { admin: adminData, accessToken: token } = data.data;
        setAuth(adminData, token);

        // Store in localStorage
        localStorage.setItem("accessToken", token);
        localStorage.setItem("admin", JSON.stringify(adminData));

        // Connect socket
        if (token) {
          socketService.connect(token, adminData._id, adminData.role);
        }

        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });

        toast.success("Login successful!");
      }
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed");
    },
  });

  // Logout function
  const logout = useCallback(() => {
    console.log("Logging out...");

    // Clear local storage - authentication
    localStorage.removeItem("accessToken");
    localStorage.removeItem("admin");
    localStorage.removeItem("rememberedEmail");

    // 🔐 Clear all encryption keys
    clearAllChatKeys();

    // Clear session storage
    sessionStorage.clear();

    // Clear auth store
    clearAuth();

    // Disconnect socket
    socketService.disconnect();

    // Clear query cache
    queryClient.clear();

    // Clear Service Worker cache if available
    if ("caches" in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          caches.delete(cacheName).catch(() => {});
        });
      });
    }

    // Redirect to login
    navigate("/login", { replace: true });

    toast.success("Logged out successfully");
  }, [clearAuth, navigate, queryClient, admin?._id]);

  // Check if user has permission
  const hasPermission = useCallback(
    (requiredRole?: "SUPER_ADMIN" | "STAFF") => {
      if (!admin) return false;
      if (!requiredRole) return true;
      return admin.role === requiredRole;
    },
    [admin],
  );

  return {
    admin,
    accessToken,
    isAuthenticated: !!admin && !!accessToken,
    isLoading: isLoading || loginMutation.isPending,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    logout,
    hasPermission,
    isSuperAdmin: admin?.role === "SUPER_ADMIN",
    isStaff: admin?.role === "STAFF",
  };
};
