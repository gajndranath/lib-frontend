import type { AxiosRequestConfig } from "axios";

// =============== ENUM TYPES ===============
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  STAFF = "STAFF",
}

export enum PaymentStatus {
  PAID = "PAID",
  UNPAID = "UNPAID",
  PARTIAL = "PARTIAL",
  ADVANCE = "ADVANCE",
}

export enum StudentStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum NotificationType {
  PAYMENT_REMINDER = "PAYMENT_REMINDER",
  DAILY_SUMMARY = "DAILY_SUMMARY",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  STUDENT_ADDED = "STUDENT_ADDED",
  SYSTEM_ALERT = "SYSTEM_ALERT",
}

// =============== BASE INTERFACES ===============
export interface BaseEntity {
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

// =============== ADMIN TYPES ===============
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sound: boolean;
  vibration: boolean;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface Admin extends BaseEntity {
  username: string;
  email: string;
  role: UserRole;
  notificationPreferences: NotificationPreferences;
  webPushSubscription?: WebPushSubscription;
  fcmToken?: string;
  lastLogin?: string;
  lastActive?: string;
  isActive: boolean;
}

// =============== STUDENT TYPES ===============
export interface Student extends BaseEntity {
  name: string;
  phone: string;
  email?: string;
  joiningDate: string;
  monthlyFees: number;
  status: StudentStatus;
  billingDay: number;
  reminderPaused: boolean;
  pauseReminderUntil?: string;
  address?: string;
  notes?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdBy?: string | Admin;
}

// =============== LEDGER TYPES ===============
export interface Ledger extends BaseEntity {
  studentId: string | Student;
  billingMonth: number;
  billingYear: number;
  dueAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  paymentDate?: string;
  carryForwardAmount: number;
  remarks?: string;
  lastReminderSent?: string;
  reminderCount: number;
  isActive: boolean;
}

// =============== DASHBOARD TYPES ===============
export interface DashboardStudent extends Student {
  paymentStatus: PaymentStatus | "NOT_GENERATED";
  dueAmount: number;
  paidAmount: number;
  paymentDate?: string;
  remarks?: string;
}

export interface DashboardSummary {
  totalStudents: number;
  paidStudents: number;
  unpaidStudents: number;
  pendingStudents: number;
  totalExpected: number;
  totalReceived: number;
  totalPending: number;
  overdueStudents?: number;
}

export interface DashboardData {
  students: DashboardStudent[];
  summary: DashboardSummary;
}

// =============== PAGINATION TYPES ===============
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// =============== API RESPONSE TYPES ===============
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  data: T;
  message: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// =============== FORM TYPES ===============
export interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

export interface StudentFormData {
  name: string;
  phone: string;
  email?: string;
  monthlyFees: number;
  joiningDate?: string;
  billingDay?: number;
  address?: string;
}

export interface PaymentFormData {
  studentId: string;
  month: number;
  year: number;
  status: PaymentStatus;
  amount?: number;
  remarks?: string;
}

export interface NotificationPreferencesFormData {
  email: boolean;
  push: boolean;
  sound: boolean;
  vibration: boolean;
}

// =============== NOTIFICATION TYPES ===============
export interface NotificationData {
  id?: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  timestamp: string;
  read?: boolean;
}

// =============== ANALYTICS TYPES ===============
export interface MonthlyReport {
  totalExpected: number;
  totalReceived: number;
  pendingAmount: number;
  paidStudents: number;
  unpaidStudents: number;
  partialPayments: number;
  advancePayments: number;
}

export interface DashboardStats {
  totalStudents: number;
  monthly: {
    totalExpected: number;
    totalReceived: number;
    pendingAmount: number;
  };
  overdue: {
    count: number;
    totalAmount: number;
  };
  activeAdmins: number;
  lastUpdated: string;
}

export interface YearlyReportItem {
  month: number;
  monthName: string;
  totalExpected: number;
  totalReceived: number;
  paidStudents: number;
}

// =============== SOCKET EVENT TYPES ===============
export interface SocketPaymentSyncData {
  studentId: string;
  studentName: string;
  month: number;
  year: number;
  status: PaymentStatus;
  amount: number;
  updatedBy: string;
  timestamp: string;
}

export interface SocketDashboardUpdateData {
  month: number;
  year: number;
  updatedBy: string;
  timestamp: string;
}

export interface SocketNotificationData {
  id?: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface SocketNewStudentData {
  studentId: string;
  studentName: string;
  addedBy: string;
  timestamp: string;
}

export interface SocketAdminConnectionData {
  adminId: string;
  socketId: string;
  timestamp: string;
}

export interface SocketAdminDisconnectionData {
  adminId: string;
  timestamp: string;
}

// =============== WEBSOCKET EVENTS MAP ===============
export interface SocketEventsMap {
  // Socket.IO built-in events
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
  reconnect: (attemptNumber: number) => void;
  reconnect_attempt: (attemptNumber: number) => void;
  reconnecting: (attemptNumber: number) => void;
  reconnect_error: (error: Error) => void;
  reconnect_failed: () => void;

  // Client to Server events
  join_admin_room: (data: { adminId: string; role: UserRole }) => void;
  payment_updated: (data: {
    studentId: string;
    month: number;
    year: number;
    status: PaymentStatus;
    amount?: number;
    updatedBy: string;
  }) => void;
  sync_dashboard: (data: { month: number; year: number }) => void;
  send_notification: (data: NotificationData) => void;
  student_added: (data: { studentId: string; studentName: string }) => void;
  ping: () => void;
  admin_disconnecting: (adminId: string) => void;

  // Server to Client events
  payment_sync: (data: SocketPaymentSyncData) => void;
  dashboard_updated: (data: SocketDashboardUpdateData) => void;
  new_notification: (data: SocketNotificationData) => void;
  new_student: (data: SocketNewStudentData) => void;
  admin_connected: (data: SocketAdminConnectionData) => void;
  admin_disconnected: (data: SocketAdminDisconnectionData) => void;
  connected_users: (data: { adminCount: number }) => void;
  pong: (data: { timestamp: string }) => void;
  user_disconnected: (data: { socketId: string; reason: string }) => void;
}

// =============== API RETURN TYPES ===============
export interface LoginResponse {
  admin: Admin;
  accessToken: string;
}

export interface NotificationSubscribeResponse {
  admin: Admin;
}

export interface NotificationTestResponse {
  email: boolean;
  push: boolean;
  webPush: boolean | "expired";
}

export interface StudentHistoryResponse {
  student: Student;
  ledgers: Ledger[];
}

export interface PaymentSummaryResponse {
  totalPaid: number;
  totalDue: number;
  pendingAmount: number;
  paymentHistory: Array<{
    month: string;
    year: number;
    dueAmount: number;
    paidAmount: number;
    status: PaymentStatus;
    paymentDate?: string;
  }>;
  lastPayment: string | null;
}

export interface StaffListResponse {
  data: Admin[];
}
// Add these if missing:

// For Web Push
export type PushSubscription = WebPushSubscription;

// For Notification API responses
export interface NotificationSubscribeResponse {
  admin: Admin;
}

export interface NotificationTestResponse {
  email: boolean;
  push: boolean;
  webPush: boolean | "expired";
}

// For axios config
export interface ApiRequestConfig extends AxiosRequestConfig {
  headers?: Record<string, string>;
}

// For service responses
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// For form validation
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
}

// Add to your existing api.types.ts

// Socket event data interfaces
export interface PaymentSyncData extends SocketPaymentSyncData {
  updatedBy: string;
}

export interface StudentSyncData extends SocketNewStudentData {
  addedBy: string;
}

// For useSocket hook
export interface UseSocketReturn {
  isConnected: boolean;
  socketId: string | null;
  connectedAdmins: number;
  emitPaymentUpdate: (data: {
    studentId: string;
    month: number;
    year: number;
    status: string;
    amount?: number;
    updatedBy: string;
  }) => void;
  emitDashboardSync: (month: number, year: number) => void;
  sendNotification: (notification: NotificationData) => void;
  connect: () => void;
  disconnect: () => void;
  isSocketConnected: () => boolean;
}
