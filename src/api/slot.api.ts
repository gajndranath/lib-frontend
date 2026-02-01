import axiosInstance, { apiCall } from "./axios";
import type {
  Slot,
  ApiResponse,
  CreateSlotFormData,
  StudentStatus,
} from "@/types";

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
      { showSuccess: true, successMessage: "Slot deactivated successfully" }
    ),
};
