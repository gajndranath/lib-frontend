// Student portal type definitions

export interface Student {
  _id: string;
  libraryId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  fatherName?: string;
  monthlyFee: number;
  status: "active" | "inactive" | "suspended";
  slotId?: string;
  joiningDate: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeeSummary {
  totals: {
    totalPaid: number;
    totalDue: number;
    totalPending: number;
  };
  monthlyFee: number;
  advance: {
    totalAmount: number;
    usedAmount: number;
    remainingAmount: number;
  };
}

export interface DueItem {
  _id: string;
  studentId: string;
  monthlyFeeId?: string;
  month: number;
  year: number;
  monthYear?: string; // virtual field
  amount: number;
  totalAmount?: number;
  status: "PAID" | "DUE" | "PENDING" | "OVERDUE";
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  _id: string;
  studentId: string;
  monthlyFeeId?: string;
  month: number;
  year: number;
  monthYear?: string; // virtual field
  amount: number;
  totalAmount?: number;
  status: "PAID" | "DUE" | "PENDING";
  paymentDate?: string;
  paymentMethod?: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentNotification {
  _id: string;
  userId: string;
  userType: "Student" | "Admin";
  title: string;
  message: string;
  type:
    | "PAYMENT_REMINDER"
    | "PAYMENT_CONFIRMATION"
    | "OVERDUE_ALERT"
    | "STUDENT_REGISTRATION"
    | "SLOT_CHANGE"
    | "FEE_OVERRIDE"
    | "SYSTEM_ALERT"
    | "TEST";
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  student: Student;
  feeSummary: FeeSummary;
  dueItems: DueItem[];
  recentPayments: Payment[];
}

export interface PaymentHistoryResponse {
  payments: Payment[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface NotificationResponse {
  notifications: StudentNotification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface OtpRequest {
  email: string;
}

export interface OtpVerification {
  email: string;
  otp: string;
  password?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ProfileUpdate {
  name?: string;
  phone?: string;
  address?: string;
  fatherName?: string;
}
