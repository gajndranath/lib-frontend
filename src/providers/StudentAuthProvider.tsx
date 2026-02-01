import { type ReactNode, useEffect, useState } from "react";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { studentAuthApi } from "@/api/studentAuth.api";

export const StudentAuthProvider = ({ children }: { children: ReactNode }) => {
  const { setLoading, setAuth, clearAuth, isLoading } = useStudentAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem("studentAccessToken");
        const storedStudent = localStorage.getItem("student");

        if (!token || !storedStudent) {
          clearAuth();
          setInitialized(true);
          return;
        }

        const { data, error } = await studentAuthApi.getProfile();
        if (error) {
          clearAuth();
          localStorage.removeItem("studentAccessToken");
          localStorage.removeItem("student");
          setInitialized(true);
          return;
        }

        if (data?.data) {
          setAuth(data.data, token);
        }
      } catch (_error) {
        clearAuth();
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [setLoading, setAuth, clearAuth]);

  if (!initialized || isLoading) {
    return null;
  }

  return <>{children}</>;
};
