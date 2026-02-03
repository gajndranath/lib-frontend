import axiosInstance, { apiCall } from "./axios";
import type {
  FeeSummary,
  StudentMonthlyFee,
  AdvanceBalance,
  ApiResponse,
  PaymentFormData,
} from "@/types";

export const feeApi = {
  // Mark fee as paid
  markFeeAsPaid: (
    studentId: string,
    month: number,
    year: number,
    paymentData: PaymentFormData,
  ) =>
    apiCall<ApiResponse<StudentMonthlyFee>>(
      axiosInstance.patch(
        `/fees/${studentId}/${month}/${year}/paid`,
        paymentData,
      ),
      { showSuccess: true, successMessage: "Payment recorded successfully" },
    ),

  // Mark fee as due
  markFeeAsDue: (
    studentId: string,
    month: number,
    year: number,
    reminderDate: Date,
  ) =>
    apiCall<
      ApiResponse<{
        monthlyFee: StudentMonthlyFee;
        dueRecord: unknown;
      }>
    >(
      axiosInstance.patch(`/fees/${studentId}/${month}/${year}/due`, {
        reminderDate,
      }),
      { showSuccess: true, successMessage: "Fee marked as due" },
    ),

  // Add advance
  addAdvance: (studentId: string, amount: number) =>
    apiCall<ApiResponse<AdvanceBalance>>(
      axiosInstance.post(`/fees/${studentId}/advance`, { amount }),
      { showSuccess: true, successMessage: "Advance added successfully" },
    ),

  // Get fee summary
  getFeeSummary: (studentId: string) =>
    apiCall<ApiResponse<FeeSummary>>(
      axiosInstance.get(`/fees/summary/${studentId}`),
    ),

  // Get dashboard payment status
  getDashboardPaymentStatus: (month?: number, year?: number) =>
    apiCall<
      ApiResponse<{
        stats: {
          total: number;
          paid: number;
          due: number;
          pending: number;
          totalAmount: number;
          paidAmount: number;
          dueAmount: number;
          pendingAmount: number;
        };
        details: Array<{
          studentId: string;
          studentName: string;
          studentStatus: string;
          month: number;
          year: number;
          baseFee: number;
          dueCarriedForward: number;
          totalAmount: number;
          status: string;
          coveredByAdvance: boolean;
          locked: boolean;
          paymentDate?: Date;
        }>;
      }>
    >(axiosInstance.get("/fees/dashboard-status", { params: { month, year } })),

  // Get receipt details (admin - JSON)
  getReceipt: (studentId: string, month: number, year: number) =>
    apiCall<
      ApiResponse<{
        receiptNumber: string;
        studentName: string;
        studentPhone: string;
        monthYear: string;
        amount: number;
        paymentDate: string;
        paymentMethod: string;
        transactionId?: string;
        remarks?: string;
      }>
    >(axiosInstance.get(`/fees/${studentId}/${month}/${year}/receipt-details`)),

  // Download receipt PDF (admin)
  downloadReceiptPDF: async (
    studentId: string,
    month: number,
    year: number,
  ) => {
    const response = await axiosInstance.get(
      `/fees/${studentId}/${month}/${year}/receipt-pdf`,
      { responseType: "blob" },
    );
    return response.data;
  },
};
