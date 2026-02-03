import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SlotChangeHistory } from "@/api/slot.api";
import { slotApi } from "@/api/slot.api";
import { studentAuthApi } from "@/api/studentAuth.api";
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
import type { Slot } from "@/types";

export default function StudentSlotChange() {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const result = await slotApi.getAllSlots();
      return result.data || [];
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["slotChangeHistory"],
    queryFn: async () => {
      const result = await studentAuthApi.getMySlotChangeHistory();
      return result.data || [];
    },
  });

  const slots = Array.isArray(slotsData) ? slotsData : [];
  const history = Array.isArray(historyData) ? historyData : [];

  const currentSlot = slots.length > 0 ? (slots[0] as Slot) : null;
  const availableSlots = slots.filter((s: Slot) => s._id !== currentSlot?._id);

  const handleRequestChange = async (newSlot: Slot) => {
    try {
      await studentAuthApi.requestSlotChange({
        newSlotId: newSlot._id,
        reason: reason || "No reason provided",
      });
      toast.success("Slot change request submitted successfully");
      setReason("");
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ["slotChangeHistory"] });
    } catch (_error) {
      toast.error("Failed to submit slot change request");
    }
  };

  if (slotsLoading || historyLoading) return <div>Loading...</div>;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">Current Slot</h2>
        {currentSlot ? (
          <div className="border rounded-lg p-4">
            <p className="font-semibold">{currentSlot.name}</p>
            <p className="text-sm text-gray-600">
              {currentSlot.timeRange.start} - {currentSlot.timeRange.end}
            </p>
            <p className="text-sm">
              Available Seats: {currentSlot.availableSeats}
            </p>
          </div>
        ) : (
          <p className="text-gray-500">No current slot assigned</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Available Slots</h2>
        <div className="grid gap-4">
          {availableSlots.map((slot: Slot) => (
            <div key={slot._id} className="border rounded-lg p-4">
              <p className="font-semibold">{slot.name}</p>
              <p className="text-sm text-gray-600">
                {slot.timeRange.start} - {slot.timeRange.end}
              </p>
              <p className="text-sm">Available: {slot.availableSeats}</p>
              <Button
                size="sm"
                onClick={() => setSelectedSlot(slot)}
                className="mt-2"
              >
                Request Change
              </Button>
            </div>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="font-bold mb-4">Request Slot Change</h3>
          <textarea
            placeholder="Reason for change (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded p-2 mb-4"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => handleRequestChange(selectedSlot)}
              variant="default"
            >
              Submit Request
            </Button>
            <Button onClick={() => setSelectedSlot(null)} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Request History</h2>
        {history.length === 0 ? (
          <p className="text-gray-500">No requests yet</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history as SlotChangeHistory[]).map(
                (request: SlotChangeHistory) => (
                  <TableRow key={request._id}>
                    <TableCell>{request.reason || "-"}</TableCell>
                    <TableCell>{request.changeType}</TableCell>
                    <TableCell>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
