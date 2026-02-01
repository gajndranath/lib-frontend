import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Mail,
  Home,
  UserCog,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Check,
  X,
  Eye,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast as useToastNotification } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { studentApi } from "@/api/students.api";
import { slotApi } from "@/api/slot.api";

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
};

interface Slot {
  _id: string;
  name: string;
  isActive: boolean;
  availableSeats: number;
  totalSeats: number;
  monthlyFee: number;
  timeRange: {
    start: string;
    end: string;
  };
}

const studentFormSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name too long"),
    phone: z.string().regex(/^[0-9]{10}$/, "Invalid phone number (10 digits)"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    fatherName: z.string().optional().or(z.literal("")),
    slotId: z.string().min(1, "Slot is required"),
    seatNumber: z.string().optional().or(z.literal("")),
    monthlyFee: z.number().min(0, "Monthly fee must be positive"),
    joiningDate: z.string().optional(),
    notes: z.string().optional().or(z.literal("")),
    tags: z.array(z.string()),
  })
  .strict();

type StudentFormData = z.infer<typeof studentFormSchema>;

export const StudentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToastNotification();
  const { hasPermission } = useAuth();
  const isEditMode = !!id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slotDetails, setSlotDetails] = useState<Slot | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [availableSeats, setAvailableSeats] = useState(0);

  // Fetch slots for dropdown
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const { data, error } = await slotApi.getAllSlots();
      if (error) throw error;
      return data?.data;
    },
  });

  // Fetch student data for edit mode
  const { data: studentData, isLoading: studentLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await studentApi.getStudentDetails(id);
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
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema) as Resolver<StudentFormData>,
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      fatherName: "",
      slotId: "",
      seatNumber: "",
      monthlyFee: 0,
      joiningDate: new Date().toISOString().split("T")[0],
      notes: "",
      tags: [],
    },
  });

  // Watch form values
  const slotId = watch("slotId");
  const tags = watch("tags") || [];
  const monthlyFee = watch("monthlyFee");

  // Load slot details when slotId changes
  useEffect(() => {
    if (slotId && slotsData) {
      const selectedSlot = slotsData.find((slot: Slot) => slot._id === slotId);
      setSlotDetails(selectedSlot || null);
      setAvailableSeats(selectedSlot?.availableSeats || 0);

      // Auto-set monthly fee from slot
      if (selectedSlot && !isEditMode) {
        setValue("monthlyFee", selectedSlot.monthlyFee);
      }
    }
  }, [slotId, slotsData, isEditMode, setValue]);

  // Load student data for edit mode
  useEffect(() => {
    if (studentData && isEditMode) {
      reset({
        name: studentData.name,
        phone: studentData.phone,
        email: studentData.email || "",
        address: studentData.address || "",
        fatherName: studentData.fatherName || "",
        slotId:
          typeof studentData.slotId === "string"
            ? studentData.slotId
            : studentData.slotId?._id || "",
        seatNumber: studentData.seatNumber || "",
        monthlyFee: studentData.monthlyFee,
        joiningDate: studentData.joiningDate
          ? new Date(studentData.joiningDate).toISOString().split("T")[0]
          : "",
        notes: studentData.notes || "",
        tags: studentData.tags || [],
      });
    }
  }, [studentData, isEditMode, reset]);

  // Check permissions
  useEffect(() => {
    if (!hasPermission("SUPER_ADMIN")) {
      toast.error("Only Super Admins can manage students");
      navigate("/students");
    }
  }, [hasPermission, navigate, toast]);

  // Handle tag input
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue("tags", [...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue(
      "tags",
      tags.filter((tag) => tag !== tagToRemove),
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Handle form submission
  const onSubmit = async (data: StudentFormData) => {
    if (!hasPermission("SUPER_ADMIN")) return;

    setIsSubmitting(true);

    try {
      // Format data for API
      const formData = {
        ...data,
        email: data.email || undefined,
        address: data.address || undefined,
        fatherName: data.fatherName || undefined,
        seatNumber: data.seatNumber || undefined,
        notes: data.notes || undefined,
        monthlyFee: Number(data.monthlyFee),
        joiningDate: data.joiningDate
          ? new Date(data.joiningDate + "T00:00:00.000Z").toISOString()
          : new Date().toISOString(),
      };

      Object.keys(formData).forEach((key) => {
        if (
          (formData as Record<string, string | number | string[] | undefined>)[
            key
          ] === undefined
        ) {
          delete (
            formData as Record<string, string | number | string[] | undefined>
          )[key];
        }
      });

      console.log("Submitting data:", formData);

      if (isEditMode && id) {
        await studentApi.updateStudent(id, formData);
        toast.success("Student updated successfully");
      } else {
        await studentApi.registerStudent(formData);
        toast.success("Student registered successfully");
      }

      navigate("/students");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save student";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = slotsLoading || (isEditMode && studentLoading);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <Card>
          <CardHeader>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(6)].map((_, i) => (
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
        <Button variant="ghost" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant={isEditMode ? "outline" : "secondary"}>
            {isEditMode ? "Edit Mode" : "New Student"}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Personal Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>Basic details of the student</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register("name")}
                        placeholder="John Doe"
                        className="pl-9"
                      />
                      {errors.name?.message && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.name.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register("phone")}
                        placeholder="9876543210"
                        className="pl-9"
                      />
                      {errors.phone?.message && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register("email")}
                        placeholder="student@example.com"
                        type="email"
                        className="pl-9 bg-white"
                      />
                      {errors.email?.message && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Father's Name
                    </label>
                    <div className="relative">
                      <UserCog className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register("fatherName")}
                        placeholder="Father's name"
                        className="pl-9"
                      />
                      {errors.fatherName?.message && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.fatherName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">
                      Address
                    </label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...register("address")}
                        placeholder="Complete address"
                        className="pl-9"
                      />
                      {errors.address?.message && (
                        <p className="text-sm text-red-600 mt-1">
                          {errors.address.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Library Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Library Information
                </CardTitle>
                <CardDescription>Slot and fee details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Select Slot *
                    </label>
                    <Select
                      value={slotId}
                      onValueChange={(value) => setValue("slotId", value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Choose a slot" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {slotsData
                          ?.filter((slot: Slot) => slot.isActive)
                          .map((slot: Slot) => (
                            <SelectItem key={slot._id} value={slot._id}>
                              <div className="flex items-center justify-between">
                                <span>{slot.name}</span>
                                <Badge variant="outline" className="ml-2">
                                  {slot.availableSeats} seats left
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {errors.slotId?.message && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.slotId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Seat Number
                    </label>
                    <Input
                      {...register("seatNumber")}
                      placeholder="Optional seat number"
                    />
                    {errors.seatNumber?.message && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.seatNumber.message}
                      </p>
                    )}
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
                        className="pl-9 bg-white"
                      />
                      {errors.monthlyFee?.message && (
                        <p className="text-sm text-red-600 mt-1 ">
                          {errors.monthlyFee.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Joining Date
                    </label>
                    <Input
                      {...register("joiningDate")}
                      type="date"
                      className="bg-white"
                    />
                    {errors.joiningDate?.message && (
                      <p className="text-sm text-red-600 mt-1">
                        {errors.joiningDate.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Slot Details Preview */}
                {slotDetails && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Selected Slot Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <span className="ml-2 font-medium">
                          {slotDetails.timeRange.start} -{" "}
                          {slotDetails.timeRange.end}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Standard Fee:
                        </span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(slotDetails.monthlyFee)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Total Seats:
                        </span>
                        <span className="ml-2 font-medium">
                          {slotDetails.totalSeats}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Available:
                        </span>
                        <span className="ml-2 font-medium">
                          {availableSeats}
                        </span>
                      </div>
                    </div>
                    {availableSeats === 0 && (
                      <p className="text-sm text-red-600 mt-2">
                        ⚠️ This slot is currently full
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Additional Information
                </CardTitle>
                <CardDescription>
                  Notes and tags for better organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Tags</label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag (e.g., 'Sports', 'Scholar')"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                      >
                        <Tag className="h-4 w-4 mr-2" />
                        Add
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Notes
                  </label>
                  <Textarea
                    className="bg-white"
                    {...register("notes")}
                    placeholder="Additional notes about the student..."
                    rows={3}
                  />
                  {errors.notes?.message && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.notes.message}
                    </p>
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
                    <span className="text-muted-foreground">Student Name</span>
                    <span className="font-medium">{watch("name") || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="font-medium">{watch("phone") || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Fee</span>
                    <span className="font-medium">
                      {formatCurrency(monthlyFee || 0)}
                    </span>
                  </div>
                  {slotDetails && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Selected Slot
                        </span>
                        <span className="font-medium">{slotDetails.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Available Seats
                        </span>
                        <span className="font-medium">{availableSeats}</span>
                      </div>
                    </>
                  )}
                </div>

                <Separator />

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
                      <span>Name (min 2 characters)</span>
                    </li>
                    <li className="flex items-center">
                      {/^[0-9]{10}$/.test(watch("phone") || "") ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300 mr-2" />
                      )}
                      <span>Valid phone number</span>
                    </li>
                    <li className="flex items-center">
                      {watch("slotId") ? (
                        <Check className="h-3 w-3 text-green-500 mr-2" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300 mr-2" />
                      )}
                      <span>Slot selected</span>
                    </li>
                    <li className="flex items-center">
                      {(watch("monthlyFee") || 0) > 0 ? (
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
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? "Update Student" : "Register Student"}
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
                  onClick={() => navigate("/students")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel & Return
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    if (isEditMode && id) {
                      navigate(`/students/${id}`);
                    }
                  }}
                  disabled={!isEditMode}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Student Details
                </Button>

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
                  <li>• Phone number must be 10 digits</li>
                  <li>• Slot selection affects monthly fee</li>
                  <li>• Students can be archived but not deleted</li>
                  <li>• Monthly fee can be overridden later if needed</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};
