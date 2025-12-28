import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AdminAPI } from "@/api/admin.api";
import { useAuthStore } from "@/store/auth.store";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "sonner";
import { socketService } from "@/services/socket.service";

export const useAuth = () => {
  const {
    setTokens,
    setAdmin,
    setLoading,
    setError,
    logout: storeLogout,
    admin,
    isAuthenticated,
  } = useAuthStore();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: AdminAPI.login,
    onSuccess: (data) => {
      const { admin, accessToken } = data;
      setTokens(accessToken);
      setAdmin(admin);
      toast.success("Login successful");

      // Connect socket after login
      socketService.connect();
    },
    onError: (error: Error) => {
      setError(error.message);
      toast.error("Login failed: " + error.message);
    },
  });

  // Logout
  const logout = () => {
    AdminAPI.logout();
    storeLogout();
    socketService.disconnect();
    toast.success("Logged out successfully");
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await AdminAPI.getProfile();
        setAdmin(profile);
      } catch {
        // Token expired or invalid
        storeLogout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [setAdmin, setLoading, storeLogout]);

  return {
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout,
    admin,
    isAuthenticated,
  };
};

export const useProfile = () => {
  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: AdminAPI.getProfile,
    enabled: !!localStorage.getItem("accessToken"),
  });

  return { profile, isLoading, error };
};

export const useUpdatePreferences = () => {
  return useMutation({
    mutationFn: AdminAPI.updateNotificationPreferences,
    onSuccess: () => {
      toast.success("Preferences updated");
    },
    onError: (error: Error) => {
      toast.error("Failed to update preferences: " + error.message);
    },
  });
};
