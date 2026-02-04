import { useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { studentAuthApi } from "@/api/studentAuth.api";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { socketService } from "@/api/socket.service";

export const useStudentAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { student, accessToken, setAuth, clearAuth, updateStudent } =
    useStudentAuthStore();

  const { data: profile } = useQuery({
    queryKey: ["student-profile", accessToken],
    queryFn: async () => {
      if (!accessToken) throw new Error("No access token");
      const { data, error } = await studentAuthApi.getProfile();
      if (error) throw error;
      return data?.data;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (profile && student?._id !== profile._id) {
      updateStudent(profile);
    }
  }, [profile, student, updateStudent]);

  const loginMutation = useMutation({
    mutationFn: studentAuthApi.login,
    onSuccess: ({ data }) => {
      if (data?.data) {
        const { student: studentData, accessToken: token } = data.data;
        setAuth(studentData, token);
        localStorage.setItem("studentAccessToken", token);
        localStorage.setItem("student", JSON.stringify(studentData));

        const from = location.state?.from?.pathname || "/student/dashboard";
        navigate(from, { replace: true });
        toast.success("Login successful!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Login failed");
    },
  });

  const logout = useCallback(() => {
    console.log("Student logging out...");

    // Clear local storage - authentication
    localStorage.removeItem("studentAccessToken");
    localStorage.removeItem("student");

    // Clear E2E encryption keypairs (CRITICAL: prevents old keypair reuse)
    if (student?._id) {
      localStorage.removeItem(`e2e_keypair_v1:Student:${student._id}`);
    }
    // Clear any leftover generic keypair keys
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.includes("e2e_keypair")) {
        localStorage.removeItem(key);
      }
    });

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

    navigate("/student/login", { replace: true });
    toast.success("Logged out successfully");
  }, [clearAuth, navigate, queryClient, student?._id]);

  return {
    student,
    accessToken,
    isAuthenticated: !!student && !!accessToken,
    login: loginMutation.mutate,
    logout,
  };
};
