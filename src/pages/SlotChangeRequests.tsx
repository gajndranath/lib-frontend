import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SlotChangeHistory } from "@/api/slot.api";
import { slotApi } from "@/api/slot.api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function SlotChangeRequests() {
  const [selectedRequest, setSelectedRequest] =
    useState<SlotChangeHistory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["slotChangeRequests"],
    queryFn: async () => {
      const result = await slotApi.getPendingSlotRequests();
      return result.data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await slotApi.approveSlotChangeRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slotChangeRequests"] });
      toast.success("Request approved successfully");
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to approve request");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await slotApi.rejectSlotChangeRequest(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slotChangeRequests"] });
      toast.success("Request rejected successfully");
      setIsDialogOpen(false);
    },
    onError: () => {
      toast.error("Failed to reject request");
    },
  });

  const requests = Array.isArray(data) ? data : [];

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Slot Change Requests</h1>

      {requests.length === 0 ? (
        <div className="text-center text-gray-500">No pending requests</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Current Slot</TableHead>
                <TableHead>Requested Slot</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => {
                const request = req as SlotChangeHistory;
                const studentInfo =
                  typeof request.studentId === "object" && request.studentId
                    ? (request.studentId as {
                        name: string;
                        phone: string;
                        email: string;
                      })
                    : null;

                return (
                  <TableRow key={request._id}>
                    <TableCell>{studentInfo?.name || "N/A"}</TableCell>
                    <TableCell>{studentInfo?.phone || "N/A"}</TableCell>
                    <TableCell>{request.previousSlotName}</TableCell>
                    <TableCell>{request.newSlotName}</TableCell>
                    <TableCell>{request.reason || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsDialogOpen(true);
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slot Change Request</DialogTitle>
            <DialogDescription>
              Review and approve or reject this slot change request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {(() => {
                const studentInfo =
                  typeof selectedRequest.studentId === "object" &&
                  selectedRequest.studentId
                    ? (selectedRequest.studentId as {
                        name: string;
                        phone: string;
                        email: string;
                      })
                    : null;
                return (
                  <>
                    <div>
                      <p className="font-semibold">
                        Student: {studentInfo?.name || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {studentInfo?.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Current Slot:</p>
                      <p className="text-sm">
                        {selectedRequest.previousSlotName}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold">Requested Slot:</p>
                      <p className="text-sm">{selectedRequest.newSlotName}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Reason:</p>
                      <p className="text-sm">{selectedRequest.reason || "-"}</p>
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                      <Button
                        variant="outline"
                        onClick={() =>
                          rejectMutation.mutate(selectedRequest._id)
                        }
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() =>
                          approveMutation.mutate(selectedRequest._id)
                        }
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
