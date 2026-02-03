import axiosInstance, { apiCall } from "./axios";
import type {
  Slot,
  ApiResponse,
  CreateSlotFormData,
  StudentStatus,
} from "@/types";

export interface SlotChangeHistory {
  _id: string;
  studentId: string;
  previousSlotId: {
    _id: string;
    name: string;
    timeRange: { start: string; end: string };
    monthlyFee: number;
  };
  previousSlotName: string;
  newSlotId: {
    _id: string;
    name: string;
    timeRange: { start: string; end: string };
    monthlyFee: number;
  };
  newSlotName: string;
  changeType: "ADMIN_INITIATED" | "STUDENT_REQUESTED" | "STUDENT_APPROVED";
  changedBy: string;
  changedByRole: "ADMIN" | "STUDENT";
  reason?: string;
  effectiveDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const slotApi = {
  // Create slot
  createSlot: (data: CreateSlotFormData) =>
    apiCall<ApiResponse<Slot>>(axiosInstance.post("/slots", data), {
      showSuccess: true,
      successMessage: "Slot created successfully",
    }),

  // Update slot
  updateSlot: (slotId: string, data: Partial<CreateSlotFormData>) =>
    apiCall<ApiResponse<Slot>>(axiosInstance.patch(`/slots/${slotId}`, data), {
      showSuccess: true,
      successMessage: "Slot updated successfully",
    }),

  // Get slot details
  getSlotDetails: (slotId: string) =>
    apiCall<
      ApiResponse<{
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
      }>
    >(axiosInstance.get(`/slots/${slotId}`)),

  // Get all slots
  getAllSlots: () =>
    apiCall<
      ApiResponse<
        Array<
          Slot & {
            occupiedSeats: number;
            availableSeats: number;
            occupancyPercentage: number;
          }
        >
      >
    >(axiosInstance.get("/slots")),

  // Delete slot (soft delete)
  deleteSlot: (slotId: string, reason: string) =>
    apiCall<ApiResponse<Slot>>(
      axiosInstance.delete(`/slots/${slotId}`, { data: { reason } }),
      { showSuccess: true, successMessage: "Slot deactivated successfully" },
    ),

  // Change student slot (Admin initiated)
  changeStudentSlot: (studentId: string, newSlotId: string, reason?: string) =>
    apiCall<
      ApiResponse<{
        student: { _id: string; name: string; email: string };
        oldSlot: { slotId: string; slotName: string };
        newSlot: { id: string; name: string };
      }>
    >(
      axiosInstance.patch(`/students/${studentId}/change-slot`, {
        newSlotId,
        reason,
      }),
      {
        showSuccess: true,
        successMessage: "Student slot changed successfully",
      },
    ),

  // Get student slot history
  getStudentSlotHistory: (studentId: string) =>
    apiCall<ApiResponse<SlotChangeHistory[]>>(
      axiosInstance.get(`/students/${studentId}/slot-history`),
    ),

  // Get pending slot change requests
  getPendingSlotRequests: () =>
    apiCall<
      ApiResponse<
        Array<
          SlotChangeHistory & {
            studentId: { name: string; phone: string; email: string };
          }
        >
      >
    >(axiosInstance.get("/students/slot-requests/pending")),

  // Approve slot change request
  approveSlotChangeRequest: (requestId: string) =>
    apiCall<
      ApiResponse<{
        message: string;
        student: { _id: string; name: string; email: string };
        oldSlot: { id: string; name: string };
        newSlot: { id: string; name: string };
      }>
    >(axiosInstance.patch(`/students/slot-requests/${requestId}/approve`), {
      showSuccess: true,
      successMessage: "Slot change request approved",
    }),

  // Reject slot change request
  rejectSlotChangeRequest: (requestId: string, reason?: string) =>
    apiCall<ApiResponse<{ message: string }>>(
      axiosInstance.patch(`/students/slot-requests/${requestId}/reject`, {
        reason,
      }),
      {
        showSuccess: true,
        successMessage: "Slot change request rejected",
      },
    ),
};
