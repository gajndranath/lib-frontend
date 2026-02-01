// User Types
export type UserRole = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export interface Admin {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status?: "active" | "inactive";
  notificationPreferences?: NotificationPreferences;
  fcmToken?: string;
  webPushSubscription?: PushSubscriptionJSON;
  isActive?: boolean;
  lastLogin?: Date;
  lastActive?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Student Types
export type StudentStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";

export interface Student {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  fatherName?: string;
  slotId?: string | { _id: string; name: string };
  seatNumber?: string;
  monthlyFee: number;
  feeOverride: boolean;
  status: StudentStatus;
  joiningDate: Date;
  leavingDate?: Date;
  isDeleted: boolean;
  notes?: string;
  tags?: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentWithDetails extends Student {
  slot?: Slot;
  feeSummary?: FeeSummary;
}

// Slot Types
export interface Slot {
  _id: string;
  name: string;
  timeRange: {
    start: string; // "09:00"
    end: string; // "11:00"
  };
  monthlyFee: number;
  totalSeats: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  occupiedSeats?: number;
  availableSeats?: number;
  occupancyPercentage?: number;
}

// Fee Types
export type FeeStatus = "PAID" | "DUE" | "PENDING";
export type PaymentMethod = "CASH" | "ONLINE" | "CHEQUE" | "OTHER";

export interface StudentMonthlyFee {
  _id: string;
  studentId: string;
  month: number; // 0-11
  year: number;
  baseFee: number;
  status: FeeStatus;
  coveredByAdvance: boolean;
  dueCarriedForwardAmount: number;
  locked: boolean;
  paymentDate?: Date;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
  totalAmount: number;
  monthYear: string;
}

export interface FeeSummary {
  student: {
    name: string;
    monthlyFee: number;
    status: StudentStatus;
  };
  feeHistory: Array<{
    month: number;
    year: number;
    baseFee: number;
    dueCarriedForward: number;
    totalAmount: number;
    status: FeeStatus;
    coveredByAdvance: boolean;
    locked: boolean;
    paymentDate?: Date;
  }>;
  advance?: {
    totalAmount: number;
    remainingAmount: number;
    monthsCovered: string[];
    lastAppliedMonth?: {
      month: number;
      year: number;
    };
  };
  due?: {
    monthsDue: string[];
    totalDueAmount: number;
    reminderDate: Date;
  };
  totals: {
    totalPaid: number;
    totalDue: number;
    totalPending: number;
  };
}

// Advance Balance Types
export interface AdvanceBalance {
  _id: string;
  studentId: string;
  totalAmount: number;
  monthsCovered: string[]; // Format: "YYYY-MM"
  remainingAmount: number;
  lastAppliedMonth?: {
    month: number;
    year: number;
  };
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Due Record Types
export interface DueRecord {
  _id: string;
  studentId: string;
  monthsDue: string[]; // Format: "YYYY-MM"
  totalDueAmount: number;
  reminderDate: Date;
  resolved: boolean;
  resolutionDate?: Date;
  remarks?: string;
  createdBy: string;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export type NotificationType =
  | "PAYMENT_REMINDER"
  | "PAYMENT_CONFIRMATION"
  | "OVERDUE_ALERT"
  | "STUDENT_REGISTRATION"
  | "SLOT_CHANGE"
  | "FEE_OVERRIDE"
  | "SYSTEM_ALERT"
  | "TEST";

export type NotificationChannel =
  | "EMAIL"
  | "SMS"
  | "FCM"
  | "WEB_PUSH"
  | "IN_APP";

export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Notification {
  _id: string;
  userId: string;
  userType: "Student" | "Admin";
  title: string;
  message: string;
  type: NotificationType;
  data: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  channels: Array<{
    channel: NotificationChannel;
    sentAt: Date;
    status: "SENT" | "DELIVERED" | "FAILED" | "PENDING";
    error?: string;
  }>;
  priority: NotificationPriority;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  email: {
    paymentReminder: boolean;
    feeAlerts: boolean;
    slotUpdates: boolean;
    newsletter: boolean;
  };
  sms: {
    paymentReminder: boolean;
    feeAlerts: boolean;
    slotUpdates: boolean;
  };
  push: {
    paymentReminder: boolean;
    feeAlerts: boolean;
    slotUpdates: boolean;
  };
}

// Reminder Types
export type ReminderType = "MONTHLY" | "DUE" | "ADVANCE_EXPIRY";

export interface Reminder {
  _id: string;
  studentId: string;
  month: number;
  year: number;
  triggerDate: Date;
  type: ReminderType;
  resolved: boolean;
  sentVia: Array<{
    channel: "EMAIL" | "PUSH" | "SMS" | "IN_APP";
    sentAt: Date;
    status: "SENT" | "FAILED" | "PENDING";
  }>;
  title?: string;
  message?: string;
  attempts: number;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics Types
export interface DashboardStats {
  overview: {
    totalStudents: number;
    activeStudents: number;
    archivedStudents: number;
    totalSlots: number;
    slotsWithOccupancy: Array<{
      _id: string;
      name: string;
      timeRange: { start: string; end: string };
      totalSeats: number;
      monthlyFee: number;
      occupiedSeats: number;
      availableSeats: number;
      occupancyPercentage: number;
    }>;
    advance: {
      totalAdvance: number;
      remainingAdvance: number;
      utilizedAdvance: number;
    };
    overdue: {
      count: number;
      totalAmount: number;
    };
  };
  currentMonth: {
    month: number;
    year: number;
    paid: number;
    due: number;
    pending: number;
    paidAmount: number;
    dueAmount: number;
    pendingAmount: number;
  };
  monthlyTrend: Array<{
    month: string;
    paid: number;
    due: number;
    paidAmount: number;
    dueAmount: number;
  }>;
  generatedAt: Date;
}

export interface SlotAnalytics {
  slot: {
    id: string;
    name: string;
    timeRange: { start: string; end: string };
    totalSeats: number;
    monthlyFee: number;
  };
  occupancy: {
    totalSeats: number;
    occupiedSeats: number;
    availableSeats: number;
    occupancyPercentage: number;
  };
  fees: {
    totalStudents: number;
    paid: number;
    due: number;
    pending: number;
    paidAmount: number;
    dueAmount: number;
    pendingAmount: number;
    collectionRate: number;
  };
  advance: {
    totalAdvance: number;
    remainingAdvance: number;
  };
}

export interface FinancialReport {
  period: {
    start: string;
    end: string;
  };
  report: Array<{
    period: string;
    year: number;
    month: number;
    totalStudents: number;
    paid: {
      count: number;
      amount: number;
      percentage: number;
    };
    due: {
      count: number;
      amount: number;
      percentage: number;
    };
    pending: {
      count: number;
      amount: number;
      percentage: number;
    };
    totals: {
      expected: number;
      collected: number;
      pending: number;
      collectionRate: number;
    };
  }>;
  summary: {
    totalStudents: number;
    totalExpected: number;
    totalCollected: number;
    totalPending: number;
    collectionRate: number;
  };
  generatedAt: Date;
}

// Pagination Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  data: T;
  message: string;
}

export interface ApiError {
  success: boolean;
  statusCode: number;
  message: string;
  errors?: unknown[];
  stack?: string;
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterStudentFormData {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  fatherName?: string;
  slotId: string;
  seatNumber?: string;
  monthlyFee: number;
  joiningDate?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateSlotFormData {
  name: string;
  timeRange: {
    start: string;
    end: string;
  };
  monthlyFee: number;
  totalSeats: number;
}

export interface PaymentFormData {
  method: PaymentMethod;
  transactionId?: string;
  remarks?: string;
}

export interface AddAdvanceFormData {
  amount: number;
}

export interface ChangeSlotFormData {
  newSlotId: string;
}

export interface OverrideFeeFormData {
  newMonthlyFee: number;
  reason: string;
}

// Socket Events
export interface SocketEvents {
  notification: (notification: Notification) => void;
  payment_sync: (data: unknown) => void;
  new_student: (data: unknown) => void;
  fee_update: (data: unknown) => void;
  reminder_alert: (data: unknown) => void;
  connected: (data: {
    success: boolean;
    message: string;
    timestamp: Date;
  }) => void;
  pong: (data: { timestamp: Date }) => void;
  system_status: (data: {
    adminCount: number;
    timestamp: Date;
    uptime: number;
  }) => void;
  admin_disconnected: (data: { adminId: string; timestamp: Date }) => void;
}

export interface SlotWithDetails {
  slot: Slot;
  occupancy: {
    totalSeats: number;
    occupiedSeats: number;
    availableSeats: number;
    occupancyPercentage: number;
  };
  students: Array<{
    _id: string;
    name: string;
    phone: string;
    seatNumber?: string;
    joiningDate: Date;
    status: StudentStatus;
    monthlyFee: number;
    email?: string;
    feeOverride: boolean;
  }>;
}
