import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StudentsAPI } from "@/api/students.api";
import { queryKeys } from "@/lib/queryClient";
import { toast } from "sonner";
import { socketService } from "@/services/socket.service";
import { useAuthStore } from "@/store/auth.store";
import type { PaymentStatus } from "@/types/api.types";

interface StudentAddedData {
  studentId: string;
  studentName: string;
}

export const useDashboardData = (month: number, year: number) => {
  return useQuery({
    queryKey: queryKeys.students.dashboard(month, year),
    queryFn: () => StudentsAPI.getDashboardData(month, year),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useStudents = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: queryKeys.students.list(params || {}),
    queryFn: () => StudentsAPI.getStudents(params),
  });
};

export const useStudent = (id: string) => {
  return useQuery({
    queryKey: queryKeys.students.detail(id),
    queryFn: () => StudentsAPI.getStudentById(id),
    enabled: !!id,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: StudentsAPI.createStudent,
    onSuccess: (student) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      toast.success(`Student "${student.name}" added successfully`);

      // Emit socket event with correct parameters
      const studentData: StudentAddedData = {
        studentId: student._id,
        studentName: student.name,
      };
      socketService.emit("student_added", studentData);
    },
    onError: (error: Error) => {
      toast.error("Failed to add student: " + error.message);
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();
  const admin = useAuthStore((state) => state.admin);

  return useMutation({
    mutationFn: StudentsAPI.updatePaymentStatus,
    onSuccess: (_ledger, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.students.dashboard(variables.month, variables.year),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.student(variables.studentId),
      });

      const action = variables.status === "PAID" ? "paid" : "marked as unpaid";
      toast.success(`Payment ${action} successfully`);

      // Emit socket event with correct parameters
      const paymentData = {
        studentId: variables.studentId,
        month: variables.month,
        year: variables.year,
        status: variables.status as PaymentStatus,
        amount: variables.amount,
        updatedBy: admin?.username || "Unknown",
        timestamp: new Date(),
      };
      socketService.emit("payment_updated", paymentData);
    },
    onError: (error: Error) => {
      toast.error("Failed to update payment: " + error.message);
    },
  });
};

export const useStudentHistory = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.students.history(studentId),
    queryFn: () => StudentsAPI.getStudentHistory(studentId),
    enabled: !!studentId,
  });
};

export const useToggleReminder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, pause }: { studentId: string; pause: boolean }) =>
      StudentsAPI.toggleReminder(studentId, pause),
    onSuccess: (_student, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      const message = variables.pause
        ? "Reminders paused for student"
        : "Reminders enabled for student";
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error("Failed to toggle reminders: " + error.message);
    },
  });
};

export const useExportData = () => {
  return useMutation({
    mutationFn: ({ month, year }: { month: number; year: number }) =>
      StudentsAPI.exportData(month, year),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `library-data-${variables.month + 1}-${variables.year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Data exported successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to export data: " + error.message);
    },
  });
};
