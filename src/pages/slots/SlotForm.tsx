import React, { useState, useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Check,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { slotApi } from "@/api/slot.api";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

const slotFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name too long"),
  timeRange: z.object({
    start: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format (HH:MM)",
      ),
    end: z
      .string()
      .regex(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Invalid time format (HH:MM)",
      ),
  }),
  monthlyFee: z.coerce
    .number()
    .positive("Monthly fee must be positive")
    .min(1, "Fee must be at least ₹1"),
  totalSeats: z.coerce
    .number()
    .int()
    .positive("Total seats must be at least 1")
    .min(1, "At least 1 seat required"),
  isActive: z.boolean().default(true),
});

type SlotFormData = z.infer<typeof slotFormSchema>;

// Time options for select
const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
});

export const SlotForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const isEditMode = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch slot data for edit mode
  const { data: slotData, isLoading } = useQuery({
    queryKey: ["slot", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await slotApi.getSlotDetails(id);
      if (error) throw error;
      return data?.data;
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SlotFormData>({
    resolver: zodResolver(slotFormSchema) as Resolver<SlotFormData>,
    mode: "onBlur",
    defaultValues: {
      name: "",
      timeRange: {
        start: "09:00",
        end: "11:00",
      },
      monthlyFee: 1000,
      totalSeats: 20,
      isActive: true,
    },
  });

  // Watch form values
  const timeRange = watch("timeRange");
  const totalSeats = watch("totalSeats");
  const monthlyFee = watch("monthlyFee");

  // Load slot data for edit mode
  useEffect(() => {
    if (slotData?.slot && isEditMode) {
      const slot = slotData.slot;
      reset({
        name: slot.name,
        timeRange: slot.timeRange,
        monthlyFee: slot.monthlyFee,
        totalSeats: slot.totalSeats,
        isActive: slot.isActive,
      });
    }
  }, [slotData, isEditMode, reset]);

  // Check permissions
  useEffect(() => {
    if (!hasPermission("SUPER_ADMIN")) {
      toast.error("Only Super Admins can manage slots");
      navigate("/slots");
    }
  }, [hasPermission, navigate, toast]);

  // Validate time range
  const validateTimeRange = () => {
    if (!timeRange.start || !timeRange.end) return true;

    const [startHour, startMinute] = timeRange.start.split(":").map(Number);
    const [endHour, endMinute] = timeRange.end.split(":").map(Number);

    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;

    return endTotal > startTotal;
  };

  // Calculate duration
  const calculateDuration = () => {
    if (!timeRange.start || !timeRange.end) return "0h 0m";

    const [startHour, startMinute] = timeRange.start.split(":").map(Number);
    const [endHour, endMinute] = timeRange.end.split(":").map(Number);

    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute;

    if (endTotal <= startTotal) return "Invalid";

    const durationMinutes = endTotal - startTotal;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  // Handle form submission
  const onSubmit = async (data: SlotFormData) => {
    if (!hasPermission("SUPER_ADMIN")) return;

    // Validate time range
    if (!validateTimeRange()) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        await slotApi.updateSlot(id, data);
        toast.success("Slot updated successfully");
      } else {
        await slotApi.createSlot(data);
        toast.success("Slot created successfully");
      }

      navigate("/slots");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save slot";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isTimeValid = validateTimeRange();
  const duration = calculateDuration();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/slots")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Slots
        </Button>
        <Card>
          <CardHeader>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/slots")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Slots
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant={isEditMode ? "secondary" : "default"}>
            {isEditMode ? "Edit Mode" : "New Slot"}
          </Badge>
          {isEditMode && slotData && (
            <Badge
              variant={
                slotData.occupancy.occupancyPercentage >= 90
                  ? "destructive"
                  : slotData.occupancy.occupancyPercentage >= 70
                    ? "secondary"
                    : "default"
              }
            >
              {slotData.occupancy.occupancyPercentage}% Occupied
            </Badge>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Slot Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>Core details of the time slot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Slot Name *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...register("name")}
                      placeholder="Morning Slot, Evening Batch, etc."
                      className={`pl-9 bg-white ${errors.name ? "border-red-500" : ""}`}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Start Time *
                    </label>
                    <Select
                      value={timeRange.start}
                      onValueChange={(value) =>
                        setValue("timeRange.start", value)
                      }
                    >
                      <SelectTrigger
                        className={
                          errors.timeRange?.start ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Select start time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] bg-white">
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={`start-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.timeRange?.start && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.timeRange.start.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      End Time *
                    </label>
                    <Select
                      value={timeRange.end}
                      onValueChange={(value) =>
                        setValue("timeRange.end", value)
                      }
                    >
                      <SelectTrigger
                        className={
                          errors.timeRange?.end ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Select end time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] bg-white">
                        {TIME_OPTIONS.map((time) => (
                          <SelectItem key={`end-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.timeRange?.end && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.timeRange.end.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Time Validation */}
                <div
                  className={`p-3 rounded-lg ${
                    isTimeValid
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock
                        className={`h-4 w-4 ${
                          isTimeValid
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      />
                      <span
                        className={`text-sm font-medium ${
                          isTimeValid
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-700 dark:text-red-300"
                        }`}
                      >
                        {isTimeValid
                          ? "Valid Time Range"
                          : "Invalid Time Range"}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{duration}</span>
                  </div>
                  {!isTimeValid && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      End time must be after start time
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Capacity & Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Capacity & Pricing
                </CardTitle>
                <CardDescription>
                  Set seat capacity and monthly fee
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Total Seats *
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register("totalSeats")}
                        type="number"
                        min="1"
                        max="100"
                        className={`pl-9 bg-white ${
                          errors.totalSeats ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    {errors.totalSeats && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.totalSeats.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum {totalSeats} students can enroll
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Monthly Fee *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register("monthlyFee")}
                        type="number"
                        step="0.01"
                        min="1"
                        className={`pl-9 bg-white ${
                          errors.monthlyFee ? "border-red-500" : ""
                        }`}
                      />
                    </div>
                    {errors.monthlyFee && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.monthlyFee.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Per student, per month
                    </p>
                  </div>
                </div>

                {/* Capacity Guidelines */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Capacity Guidelines
                  </h4>
                  <ul className="text-sm space-y-1 text-blue-700 dark:text-blue-400">
                    <li>• Small batch: 10-15 seats (personalized attention)</li>
                    <li>• Medium batch: 16-30 seats (balanced learning)</li>
                    <li>• Large batch: 31-50 seats (cost-effective)</li>
                    <li>• Consider room size and teaching style</li>
                    <li>• Can be adjusted later if needed</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Status & Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
                <CardDescription>Set slot availability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          watch("isActive")
                            ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {watch("isActive") ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {watch("isActive") ? "Active" : "Inactive"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {watch("isActive")
                            ? "Slot is available for new enrollments"
                            : "Slot is not accepting new students"}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setValue("isActive", !watch("isActive"))}
                    >
                      {watch("isActive") ? "Deactivate" : "Activate"}
                    </Button>
                  </div>

                  {isEditMode && slotData && (
                    <div className="text-sm text-muted-foreground">
                      <p>
                        <span className="font-medium">Note:</span> This slot
                        currently has {slotData.occupancy.occupiedSeats}{" "}
                        enrolled students.
                        {!watch("isActive") &&
                          slotData.occupancy.occupiedSeats > 0 && (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              {" "}
                              Existing students will remain enrolled.
                            </span>
                          )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Review before saving</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slot Name</span>
                    <span className="font-medium">{watch("name") || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {timeRange.start} - {timeRange.end}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">{duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Seats</span>
                    <span className="font-medium">{totalSeats}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Fee</span>
                    <span className="font-medium">
                      {formatCurrency(monthlyFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant={watch("isActive") ? "default" : "secondary"}
                    >
                      {watch("isActive") ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Revenue Projection */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Monthly Revenue Potential:
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(monthlyFee * totalSeats)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    If all {totalSeats} seats are filled
                  </div>
                </div>

                <Separator />

                {/* Validation Checklist */}
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Requirements:
                  </div>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center">
                      {watch("name")?.length >= 2 ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300 mr-2" />
                      )}
                      <span>Slot name (min 2 characters)</span>
                    </li>
                    <li className="flex items-center">
                      {isTimeValid ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300 mr-2" />
                      )}
                      <span>Valid time range</span>
                    </li>
                    <li className="flex items-center">
                      {(totalSeats || 0) >= 1 ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300 mr-2" />
                      )}
                      <span>At least 1 seat</span>
                    </li>
                    <li className="flex items-center">
                      {(monthlyFee || 0) >= 1 ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300 mr-2" />
                      )}
                      <span>Positive monthly fee</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={isSubmitting}
                  disabled={isSubmitting || !isTimeValid}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? "Update Slot" : "Create Slot"}
                </Button>
              </CardFooter>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/slots")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel & Return
                </Button>

                {isEditMode && (
                  <Link to={`/slots/${id}`} className="w-full">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      type="button"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Slot Details
                    </Button>
                  </Link>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => reset()}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reset Form
                </Button>
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="text-yellow-700 dark:text-yellow-400">
                  Important Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-400">
                  <li>• Fields marked with * are required</li>
                  <li>• Time format must be HH:MM (24-hour)</li>
                  <li>• End time must be after start time</li>
                  <li>• Seats can be reduced only if unoccupied</li>
                  <li>• Monthly fee can be overridden per student</li>
                  <li>• Inactive slots don't accept new students</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};
