import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/queryClient";
import { socketService } from "@/services/socket.service";
import { webPushService } from "@/services/notification.service";
import { useAuthStore } from "@/store/auth.store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Layout } from "@/components/layout/Layout";
import { LoginPage } from "@/pages/Login";
import { DashboardPage } from "@/pages/Dashboard";
import { StudentsPage } from "@/pages/Students";
import { PaymentsPage } from "@/pages/Payments";
import { ReportsPage } from "@/pages/Reports";
import { SettingsPage } from "@/pages/Settings";

// Import error boundary for production
const ErrorBoundary = React.lazy(
  () => import("@/components/layout/ErrorBoundary")
);

function AppRoutes() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      await initialize();
    };

    initAuth();
  }, [initialize]);

  // Initialize socket connection if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
      webPushService.setupNotificationHandler();

      if (webPushService.isPushSupported()) {
        webPushService.requestPermission();
        webPushService.checkSubscription();
      }
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route - login page */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />

      {/* Protected routes - only if authenticated */}
      {isAuthenticated ? (
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      ) : (
        // If not authenticated, all routes redirect to login
        <Route path="/*" element={<Navigate to="/login" replace />} />
      )}

      {/* Fallback route */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <React.Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        }
      >
        <ErrorBoundary>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ErrorBoundary>
      </React.Suspense>

      <Toaster
        position="top-right"
        richColors
        closeButton
        expand={false}
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          },
        }}
      />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
