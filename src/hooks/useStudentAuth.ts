import { useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { studentAuthApi } from "@/api/studentAuth.api";
import { useStudentAuthStore } from "@/store/studentAuth.store";

export const useStudentAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
    localStorage.removeItem("studentAccessToken");
    localStorage.removeItem("student");
    clearAuth();
    navigate("/student/login", { replace: true });
  }, [clearAuth, navigate]);

  return {
    student,
    accessToken,
    isAuthenticated: !!student && !!accessToken,
    login: loginMutation.mutate,
    logout,
  };
};
