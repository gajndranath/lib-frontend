import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";
import { Dashboard } from "@/pages/Dashboard";

// Student portal pages
import { StudentRegister } from "@/pages/student/StudentRegister";
import { StudentLogin } from "@/pages/student/StudentLogin";
import { StudentVerifyEmail } from "@/pages/student/StudentVerifyEmail";
import { StudentForgotPassword } from "@/pages/student/StudentForgotPassword";
import { StudentDashboard } from "@/pages/student/StudentDashboard";
import { StudentProfile } from "@/pages/student/StudentProfile";
import { StudentPaymentHistory } from "@/pages/student/StudentPaymentHistory";
import { StudentNotifications } from "@/pages/student/StudentNotifications";
import StudentSlotChange from "@/pages/student/StudentSlotChange";
import StudentChat from "@/pages/student/StudentChat";
import StudentAnnouncements from "@/pages/student/StudentAnnouncements";
// Import other pages as we create them
import { StudentList } from "@/pages/students/StudentList";
import { StudentForm } from "@/pages/students/StudentForm";
import { StudentDetail } from "@/pages/students/StudentDetail";

import { SlotList } from "@/pages/slots/SlotList";
import { SlotForm } from "@/pages/slots/SlotForm";
import { SlotDetail } from "@/pages/slots/SlotDetail";

// Fee pages
import { FeeDashboard } from "@/pages/fees/FeeDashboard";
import { MarkPayment } from "@/pages/fees/MarkPayment";
import { AdvanceManagement } from "@/pages/fees/AdvanceManagement";
import { DueTracking } from "@/pages/fees/DueTracking";

// Other pages
import { Analytics } from "@/pages/Analytics";
import { Notifications } from "@/pages/Notifications";
import { Profile } from "@/pages/Profile";
import { Settings } from "@/pages/Settings";
import { StaffManagement } from "@/pages/StaffManagement";
import { AuditLog } from "@/pages/AuditLog";
import { AdminReminders } from "@/pages/AdminReminders";
import { EndOfMonthDueReport } from "@/pages/EndOfMonthDueReport";
import SlotChangeRequests from "@/pages/SlotChangeRequests";
import AdminChat from "@/pages/chat/AdminChat";
import AdminAnnouncements from "@/pages/announcements/AdminAnnouncements";

export const router = createBrowserRouter([
  // Student portal routes
  {
    path: "/student",
    children: [
      {
        path: "register",
        element: <StudentRegister />,
      },
      {
        path: "login",
        element: <StudentLogin />,
      },
      {
        path: "verify-email",
        element: <StudentVerifyEmail />,
      },
      {
        path: "forgot-password",
        element: <StudentForgotPassword />,
      },
      {
        element: <StudentLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/student/dashboard" replace />,
          },
          {
            path: "dashboard",
            element: <StudentDashboard />,
          },
          {
            path: "profile",
            element: <StudentProfile />,
          },
          {
            path: "payments",
            element: <StudentPaymentHistory />,
          },
          {
            path: "notifications",
            element: <StudentNotifications />,
          },
          {
            path: "slot-change",
            element: <StudentSlotChange />,
          },
          {
            path: "chat",
            element: <StudentChat />,
          },
          {
            path: "announcements",
            element: <StudentAnnouncements />,
          },
        ],
      },
    ],
  },

  // Admin portal routes
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "chat",
        element: <AdminChat />,
      },
      {
        path: "announcements",
        element: <AdminAnnouncements />,
      },
      {
        path: "students",
        children: [
          {
            index: true,
            element: <StudentList />,
          },
          {
            path: "new",
            element: <StudentForm />,
          },
          {
            path: ":id",
            element: <StudentDetail />,
          },
          {
            path: ":id/edit",
            element: <StudentForm />,
          },
        ],
      },

      {
        path: "slots",
        children: [
          {
            index: true,
            element: <SlotList />,
          },
          {
            path: "new",
            element: <SlotForm />,
          },
          {
            path: ":id",
            element: <SlotDetail />,
          },
          {
            path: ":id/edit",
            element: <SlotForm />,
          },
        ],
      },
      // Fees
      {
        path: "fees",
        children: [
          {
            index: true,
            element: <FeeDashboard />,
          },
          {
            path: "mark-payment",
            element: <MarkPayment />,
          },
          {
            path: "advance",
            element: <AdvanceManagement />,
          },
          {
            path: "due",
            element: <DueTracking />,
          },
        ],
      },
      {
        path: "analytics",
        element: <Analytics />,
      },
      {
        path: "notifications",
        element: <Notifications />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      // Admin only routes
      {
        path: "admin/staff",
        element: <StaffManagement />,
      },
      {
        path: "admin/audit",
        element: <AuditLog />,
      },
      {
        path: "admin/reminders",
        element: <AdminReminders />,
      },
      {
        path: "admin/due-report",
        element: <EndOfMonthDueReport />,
      },
      {
        path: "admin/slot-change-requests",
        element: <SlotChangeRequests />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
