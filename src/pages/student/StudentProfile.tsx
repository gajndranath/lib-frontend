import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Phone, MapPin, Edit, Save, X } from "lucide-react";
import { studentAuthApi } from "@/api/studentAuth.api";
import type { Student } from "@/types/student.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const StudentProfile = () => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    fatherName: "",
  });

  const { data: student, isLoading } = useQuery<Student | undefined>({
    queryKey: ["student-profile"],
    queryFn: async () => {
      const { data } = await studentAuthApi.getProfile();
      return data?.data as Student | undefined;
    },
  });

  const updateMutation = useMutation({
    mutationFn: studentAuthApi.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-profile"] });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    },
  });

  const handleSave = () => {
    updateMutation.mutate(draft);
  };

  const handleEdit = () => {
    if (student) {
      setDraft({
        name: student.name || "",
        phone: student.phone || "",
        email: student.email || "",
        address: student.address || "",
        fatherName: student.fatherName || "",
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (student) {
      setDraft({
        name: student.name || "",
        phone: student.phone || "",
        email: student.email || "",
        address: student.address || "",
        fatherName: student.fatherName || "",
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const slot =
    student && typeof student.slotId === "object" ? student.slotId : undefined;

  const displayData = {
    name: isEditing ? draft.name : student?.name || "",
    fatherName: isEditing ? draft.fatherName : student?.fatherName || "",
    email: isEditing ? draft.email : student?.email || "",
    phone: isEditing ? draft.phone : student?.phone || "",
    address: isEditing ? draft.address : student?.address || "",
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Your basic details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={displayData.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fatherName">Father's Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fatherName"
                  value={displayData.fatherName}
                  onChange={(e) =>
                    setDraft({ ...draft, fatherName: e.target.value })
                  }
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={displayData.email}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={displayData.phone}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value })
                  }
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="address"
                  value={displayData.address}
                  onChange={(e) =>
                    setDraft({ ...draft, address: e.target.value })
                  }
                  disabled={!isEditing}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Library Slot Information</CardTitle>
          <CardDescription>Seat and timing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Slot Name</p>
              <p className="font-medium">{slot?.name || "Not assigned"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Timing</p>
              <p className="font-medium">
                {slot?.timeRange
                  ? `${slot.timeRange.start} - ${slot.timeRange.end}`
                  : "Not available"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Seat Number</p>
              <p className="font-medium">
                {student?.seatNumber || "Not assigned"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Monthly Fee</p>
              <p className="font-medium">₹{student?.monthlyFee ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Library Details</CardTitle>
          <CardDescription>Your enrollment and fee information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Student ID</p>
              <p className="font-medium">{student?._id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Fee</p>
              <p className="font-medium">₹{student?.monthlyFee}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium">{student?.status}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Joining Date</p>
              <p className="font-medium">
                {student?.joiningDate
                  ? new Date(student.joiningDate).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
