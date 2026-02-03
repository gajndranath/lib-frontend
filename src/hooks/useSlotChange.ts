import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { slotApi } from "@/api/slot.api";
import { studentAuthApi } from "@/api/studentAuth.api";
import { toast } from "sonner";

// Admin hook - Change student slot
export const useAdminChangeStudentSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      studentId,
      newSlotId,
      reason,
    }: {
      studentId: string;
      newSlotId: string;
      reason?: string;
    }) => slotApi.changeStudentSlot(studentId, newSlotId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Slot changed successfully");
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { message?: string } } };
      const message =
        apiError?.response?.data?.message || "Failed to change student slot";
      toast.error(message);
    },
  });
};

// Admin hook - Get pending slot change requests
export const usePendingSlotRequests = () => {
  return useQuery({
    queryKey: ["pendingSlotRequests"],
    queryFn: () => slotApi.getPendingSlotRequests(),
  });
};

// Admin hook - Approve slot change request
export const useApproveSlotChangeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      slotApi.approveSlotChangeRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingSlotRequests"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
};

// Admin hook - Reject slot change request
export const useRejectSlotChangeRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason?: string;
    }) => slotApi.rejectSlotChangeRequest(requestId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingSlotRequests"] });
    },
  });
};

// Admin hook - Get student slot change history
export const useStudentSlotHistory = (studentId?: string) => {
  return useQuery({
    queryKey: ["studentSlotHistory", studentId],
    queryFn: () => slotApi.getStudentSlotHistory(studentId!),
    enabled: !!studentId,
  });
};

// Student hook - Request slot change
export const useRequestSlotChange = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { newSlotId: string; reason?: string }) =>
      studentAuthApi.requestSlotChange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mySlotChangeHistory"] });
      queryClient.invalidateQueries({ queryKey: ["studentProfile"] });
    },
  });
};

// Student hook - Get my slot change history
export const useMySlotChangeHistory = () => {
  return useQuery({
    queryKey: ["mySlotChangeHistory"],
    queryFn: () => studentAuthApi.getMySlotChangeHistory(),
  });
};

// Get my slot changes (Student view)
export const useSlotChange = () => {
  const { isLoading, error } = useQuery({
    queryKey: ["slotChanges"],
    queryFn: async () => {
      const response = await studentAuthApi.getMySlotChangeHistory();
      return response.data;
    },
  });

  return { isLoading, error };
};
