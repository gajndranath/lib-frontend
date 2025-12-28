import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth.store";
import { Loading } from "@/components/layout/Loading";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireSuperAdmin = false,
}) => {
  const { isAuthenticated, isLoading, admin } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    // Save the attempted URL for redirect after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireSuperAdmin && admin?.role !== "SUPER_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
