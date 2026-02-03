import { type ReactNode, useEffect, useState } from "react";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { studentAuthApi } from "@/api/studentAuth.api";

export const StudentAuthProvider = ({ children }: { children: ReactNode }) => {
  const { setLoading, setAuth, clearAuth, isLoading, accessToken, student } =
    useStudentAuthStore();
  const [initialized, setInitialized] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(
    useStudentAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsubscribe = useStudentAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const initializeAuth = async () => {
      try {
        setLoading(true);

        // Check Zustand store for persisted auth data
        if (!accessToken || !student) {
          setInitialized(true);
          return;
        }

        // Validate token by fetching profile
        const { data, error } = await studentAuthApi.getProfile();
        if (error) {
          setInitialized(true);
          return;
        }

        if (data?.data) {
          setAuth(data.data, accessToken);
        }
      } catch (_error) {
        // Keep session until manual logout
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [hasHydrated, accessToken, student, setLoading, setAuth, clearAuth]);

  if (!initialized || isLoading) {
    return null;
  }

  return <>{children}</>;
};
