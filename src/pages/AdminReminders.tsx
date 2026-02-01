import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Pause,
  Play,
  X,
  Send,
  AlertCircle,
  Users,
  Calendar,
  Clock,
  Mail,
  Smartphone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Textarea } from "@/components/ui/textarea";
import { reminderApi } from "@/api/reminder.api";
import { useToast } from "@/hooks/useToast";

// Helper function for safe capitalization
const capitalizeSafe = (value?: string | null): string => {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export const AdminReminders: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "active" | "paused">("active");
  const [selectedReminder, setSelectedReminder] = useState<string | null>(null);
  const [pauseDialog, setPauseDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");

  // Fetch reminders
  const { data: remindersData, isLoading } = useQuery({
    queryKey: ["admin-reminders", filter],
    queryFn: async () => {
      const isPaused =
        filter === "paused" ? true : filter === "active" ? false : undefined;
      const { data, error } = await reminderApi.getMyReminders({ isPaused });
      if (error) throw error;
      return data?.data || [];
    },
  });

  const reminders = remindersData || [];

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: (reminderId: string) =>
      reminderApi.pauseReminder(reminderId, pauseReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reminders"] });
      setPauseDialog(false);
      setPauseReason("");
      setSelectedReminder(null);
      toast.success("Reminder paused successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to pause reminder");
    },
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: (reminderId: string) => reminderApi.resumeReminder(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reminders"] });
      toast.success("Reminder resumed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to resume reminder");
    },
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: (reminderId: string) => reminderApi.stopReminder(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reminders"] });
      setSelectedReminder(null);
      toast.success("Reminder stopped successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to stop reminder");
    },
  });

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: (reminderId: string) => reminderApi.sendReminder(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reminders"] });
      toast.success("Reminder sent successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send reminder");
    },
  });

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "DUE_STUDENTS":
        return "destructive";
      case "END_OF_MONTH_DUE":
        return "secondary";
      case "PAYMENT_PENDING":
        return "outline";
      default:
        return "default";
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "DUE_STUDENTS":
        return "Student Due";
      case "END_OF_MONTH_DUE":
        return "Month-End Reminder";
      case "PAYMENT_PENDING":
        return "Payment Pending";
      default:
        return type || "Unknown";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <Bell className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reminders</h1>
        <p className="text-gray-600">
          Manage your student payment reminders and notifications
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "active", "paused"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {capitalizeSafe(f)}
          </Button>
        ))}
      </div>

      {/* Reminders Grid */}
      {reminders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                No reminders found. Student due reminders will appear here
                automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reminders.map((reminder) => (
            <Card key={reminder._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-lg">
                        {reminder.title || "Untitled Reminder"}
                      </CardTitle>
                      <Badge variant={getTypeColor(reminder.type)}>
                        {getTypeLabel(reminder.type)}
                      </Badge>
                      {reminder.isPaused && (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {reminder.message || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {reminder.isPaused ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resumeMutation.mutate(reminder._id)}
                        disabled={resumeMutation.isPending}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedReminder(reminder._id);
                          setPauseDialog(true);
                        }}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Affected Students */}
                {reminder.affectedStudents &&
                  reminder.affectedStudents.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">
                          {reminder.affectedStudents.length} Student(s)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {reminder.affectedStudents.map((student) => (
                          <Badge key={student._id} variant="secondary">
                            {student.name || "Unknown"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Schedule Info */}
                {reminder.schedule && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{capitalizeSafe(reminder.schedule.type)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>
                        {reminder.schedule.startDate
                          ? new Date(
                              reminder.schedule.startDate,
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Delivery Channels */}
                {reminder.deliverVia && reminder.deliverVia.length > 0 && (
                  <div className="flex items-center gap-2">
                    {reminder.deliverVia.includes("EMAIL") && (
                      <Badge variant="outline">
                        <Mail className="h-3 w-3 mr-1" />
                        Email
                      </Badge>
                    )}
                    {reminder.deliverVia.includes("PUSH") && (
                      <Badge variant="outline">
                        <Smartphone className="h-3 w-3 mr-1" />
                        Push
                      </Badge>
                    )}
                    {reminder.deliverVia.includes("IN_APP") && (
                      <Badge variant="outline">
                        <Bell className="h-3 w-3 mr-1" />
                        In-App
                      </Badge>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendMutation.mutate(reminder._id)}
                    disabled={sendMutation.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Now
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedReminder(reminder._id);
                      if (
                        window.confirm(
                          "Are you sure you want to stop this reminder?",
                        )
                      ) {
                        stopMutation.mutate(reminder._id);
                      }
                    }}
                    disabled={stopMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pause Dialog */}
      <Dialog open={pauseDialog} onOpenChange={setPauseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Reminder</DialogTitle>
            <DialogDescription>
              Temporarily pause this reminder. You can resume it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Reason for pausing (optional)"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPauseDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedReminder) {
                    pauseMutation.mutate(selectedReminder);
                  }
                }}
                disabled={pauseMutation.isPending}
              >
                Pause Reminder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
