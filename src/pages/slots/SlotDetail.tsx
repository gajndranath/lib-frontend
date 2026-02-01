import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";

import {
  ArrowLeft,
  Edit,
  Users,
  Calendar,
  DollarSign,
  Clock,
  UserPlus,
  UserMinus,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MoreVertical,
  RefreshCw,
  Download,
  Trash2,
  BarChart3,
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { slotApi } from "@/api/slot.api";
import { studentApi } from "@/api/students.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate, calculatePercentage } from "@/lib/utils";
import type { StudentStatus } from "@/types";

export const SlotDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "ALL">(
    "ALL"
  );
  const [deactivateReason, setDeactivateReason] = useState("");

  // Fetch slot details
  const { data: slotData, isLoading } = useQuery({
    queryKey: ["slot", id],
    queryFn: async () => {
      if (!id) throw new Error("Slot ID is required");
      const { data, error } = await slotApi.getSlotDetails(id);
      if (error) throw error;
      return data?.data;
    },
  });

  // Fetch students in this slot
  const { data: studentsData } = useQuery({
    queryKey: ["students-by-slot", id, statusFilter],
    queryFn: async () => {
      if (!id) throw new Error("Slot ID is required");
      const params: { slotId: string; status?: StudentStatus } = { slotId: id };
      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }
      const { data, error } = await studentApi.searchStudents(params);
      if (error) throw error;
      return data?.data;
    },
  });

  // Delete slot mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Slot ID is required");
      const { error } = await slotApi.deleteSlot(
        id,
        "Deleted from slot detail page"
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Slot deactivated successfully");
      setDeleteDialog(false);
      navigate("/slots");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to deactivate slot");
    },
  });

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["slot", id] });
    toast.success("Slot data refreshed");
  };

  // Handle export
  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/slots")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Slots
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" disabled>
              <RefreshCw className="h-4 w-4 animate-spin" />
            </Button>
          </div>
        </div>

        {/* Skeleton loader */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!slotData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/slots")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Slots
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Slot not found</h3>
            <p className="text-muted-foreground mb-6">
              The slot you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/slots">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Slots
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { slot, occupancy, students } = slotData;
  const filteredStudents = studentsData?.students || students;

  // Calculate stats
  const activeStudents = filteredStudents.filter(
    (s: typeof students[0]) => s.status === "ACTIVE"
  ).length;
  const inactiveStudents = filteredStudents.filter(
    (s: typeof students[0]) => s.status === "INACTIVE"
  ).length;
  const archivedStudents = filteredStudents.filter(
    (s: typeof students[0]) => s.status === "ARCHIVED"
  ).length;

  // Calculate collection rate
  const collectionRate =
    occupancy.occupiedSeats > 0
      ? calculatePercentage(activeStudents, occupancy.occupiedSeats)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/slots")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{slot.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={slot.isActive ? "default" : "secondary"}
                className="gap-1"
              >
                <Clock className="h-3 w-3" />
                {slot.isActive ? "Active" : "Inactive"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Slot ID: {slot._id.slice(-8)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasPermission("SUPER_ADMIN") && (
                <>
                  <DropdownMenuItem>
                    <Link
                      to={`/slots/${slot._id}/edit`}
                      className="flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Slot
                    </Link>
                  </DropdownMenuItem>

                  {slot.isActive && (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deactivate Slot
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem>
                <BarChart3 className="h-4 w-4 mr-2" />
                Generate Report
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Seats</p>
                <p className="text-2xl font-bold">{slot.totalSeats}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-2xl font-bold text-green-600">
                  {occupancy.occupiedSeats}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{occupancy.availableSeats}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Fee</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(slot.monthlyFee)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Slot Details */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Slot Details</CardTitle>
                <CardDescription>
                  Complete information about this time slot
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Time Range
                    </label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {slot.timeRange.start} - {slot.timeRange.end}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Duration
                    </label>
                    <div className="font-medium">
                      {(() => {
                        const [startHour, startMinute] = slot.timeRange.start
                          .split(":")
                          .map(Number);
                        const [endHour, endMinute] = slot.timeRange.end
                          .split(":")
                          .map(Number);
                        const duration =
                          endHour * 60 +
                          endMinute -
                          (startHour * 60 + startMinute);
                        const hours = Math.floor(duration / 60);
                        const minutes = duration % 60;
                        return `${hours}h ${minutes}m`;
                      })()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Monthly Fee
                    </label>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatCurrency(slot.monthlyFee)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Status
                    </label>
                    <div>
                      <Badge variant={slot.isActive ? "default" : "secondary"}>
                        {slot.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {!slot.isActive && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Not accepting new students
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Created
                    </label>
                    <div className="font-medium">
                      {formatDate(slot.createdAt)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Last Updated
                    </label>
                    <div className="font-medium">
                      {formatDate(slot.updatedAt)}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Occupancy Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      Occupancy Rate
                    </label>
                    <span className="font-bold">
                      {occupancy.occupancyPercentage}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        occupancy.occupancyPercentage >= 90
                          ? "bg-red-500"
                          : occupancy.occupancyPercentage >= 70
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${occupancy.occupancyPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{occupancy.occupiedSeats} occupied</span>
                    <span>{occupancy.availableSeats} available</span>
                    <span>{slot.totalSeats} total</span>
                  </div>
                </div>

                {/* Status Indicators */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="text-2xl font-bold text-green-600">
                      {activeStudents}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-400">
                      Active
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="text-2xl font-bold text-yellow-600">
                      {inactiveStudents}
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-400">
                      Inactive
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <div className="text-2xl font-bold text-gray-600">
                      {archivedStudents}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-400">
                      Archived
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue & Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Actions</CardTitle>
                <CardDescription>
                  Financial overview and quick actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Current Revenue
                    </span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(
                        slot.monthlyFee * occupancy.occupiedSeats
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Potential Revenue
                    </span>
                    <span className="font-bold">
                      {formatCurrency(slot.monthlyFee * slot.totalSeats)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Collection Rate
                    </span>
                    <span className="font-bold">{collectionRate}%</span>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Monthly Revenue Potential:
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        slot.monthlyFee * occupancy.occupiedSeats
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      From {occupancy.occupiedSeats} students
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className="space-y-2">
                  {hasPermission("SUPER_ADMIN") && (
                    <>
                      <Link to={`/students/new?slotId=${slot._id}`}>
                        <Button className="w-full">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Student to Slot
                        </Button>
                      </Link>
                      <Link to={`/slots/${slot._id}/edit`}>
                        <Button variant="outline" className="w-full">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Slot Details
                        </Button>
                      </Link>
                      {slot.isActive && (
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => setDeleteDialog(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deactivate Slot
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest enrollments and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredStudents.slice(0, 3).map((student: typeof students[0]) => (
                  <div
                    key={student._id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-medium text-primary">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.phone} • Joined{" "}
                          {formatDate(student.joiningDate)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          student.status === "ACTIVE"
                            ? "default"
                            : student.status === "INACTIVE"
                            ? "secondary"
                            : "secondary"
                        }
                      >
                        {student.status}
                      </Badge>
                      <div className="text-sm font-medium mt-1">
                        {formatCurrency(student.monthlyFee)}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredStudents.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">
                      No students enrolled in this slot
                    </p>
                    {hasPermission("SUPER_ADMIN") && (
                      <Link to={`/students/new?slotId=${slot._id}`}>
                        <Button className="mt-4">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add First Student
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Students in Slot</CardTitle>
                  <CardDescription>
                    {filteredStudents.length} students enrolled in {slot.name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      setStatusFilter(value as StudentStatus | "ALL")
                    }
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  {hasPermission("SUPER_ADMIN") && (
                    <Link to={`/students/new?slotId=${slot._id}`}>
                      <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Student
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Monthly Fee</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student: typeof students[0]) => (
                      <TableRow key={student._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                              style={{
                                backgroundColor: stringToColor(student.name),
                              }}
                            >
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{student.name}</div>
                              {student.email && (
                                <div className="text-xs text-muted-foreground">
                                  {student.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === "ACTIVE"
                                ? "default"
                                : student.status === "INACTIVE"
                                ? "secondary"
                                : "secondary"
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-bold">
                            {formatCurrency(student.monthlyFee)}
                          </div>
                          {student.feeOverride && (
                            <div className="text-xs text-yellow-600">
                              Custom Fee
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(student.joiningDate)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Link
                                  to={`/students/${student._id}`}
                                  className="flex items-center"
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {hasPermission("SUPER_ADMIN") && (
                                <DropdownMenuItem>
                                  <Link
                                    to={`/students/${student._id}/edit`}
                                    className="flex items-center"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}

                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <h3 className="font-semibold mb-2">
                            No students found
                          </h3>
                          <p className="text-muted-foreground">
                            {statusFilter !== "ALL"
                              ? "No students match the selected filter"
                              : "No students are enrolled in this slot"}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Occupancy Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Occupancy Analytics</CardTitle>
                <CardDescription>Seat utilization and trends</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Occupancy Rate
                    </span>
                    <span className="font-bold">
                      {occupancy.occupancyPercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Compared to Average
                    </span>
                    <span
                      className={`font-bold ${
                        occupancy.occupancyPercentage > 70
                          ? "text-green-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {occupancy.occupancyPercentage > 70 ? "Above" : "Below"}{" "}
                      Average
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Growth Potential
                    </span>
                    <span className="font-bold">
                      {occupancy.availableSeats} seats
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Capacity Status
                  </div>
                  <div
                    className={`p-3 rounded-lg ${
                      occupancy.occupancyPercentage >= 90
                        ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                        : occupancy.occupancyPercentage >= 70
                        ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
                        : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {occupancy.occupancyPercentage >= 90 ? (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      ) : occupancy.occupancyPercentage >= 70 ? (
                        <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                      <div>
                        <div
                          className={`font-medium ${
                            occupancy.occupancyPercentage >= 90
                              ? "text-red-700 dark:text-red-300"
                              : occupancy.occupancyPercentage >= 70
                              ? "text-yellow-700 dark:text-yellow-300"
                              : "text-green-700 dark:text-green-300"
                          }`}
                        >
                          {occupancy.occupancyPercentage >= 90
                            ? "High Occupancy"
                            : occupancy.occupancyPercentage >= 70
                            ? "Moderate Occupancy"
                            : "Good Capacity"}
                        </div>
                        <div
                          className={`text-sm ${
                            occupancy.occupancyPercentage >= 90
                              ? "text-red-600 dark:text-red-400"
                              : occupancy.occupancyPercentage >= 70
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {occupancy.occupancyPercentage >= 90
                            ? "Consider creating a new slot or expanding capacity"
                            : occupancy.occupancyPercentage >= 70
                            ? "Monitor closely for potential expansion needs"
                            : "Good capacity for new enrollments"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
                <CardDescription>
                  Financial performance and projections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Current Monthly Revenue
                    </span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(
                        slot.monthlyFee * occupancy.occupiedSeats
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Potential Monthly Revenue
                    </span>
                    <span className="font-bold">
                      {formatCurrency(slot.monthlyFee * slot.totalSeats)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Revenue Achievement
                    </span>
                    <span className="font-bold">{collectionRate}%</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Projected Annual Revenue
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      slot.monthlyFee * occupancy.occupiedSeats * 12
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Based on current occupancy
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Recommendations
                  </div>
                  <ul className="space-y-2 text-sm">
                    {occupancy.availableSeats > 0 && (
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                        <span>
                          <span className="font-medium">Promote Slot:</span>{" "}
                          {occupancy.availableSeats} seats available for new
                          enrollments
                        </span>
                      </li>
                    )}
                    {collectionRate < 90 && (
                      <li className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <span>
                          <span className="font-medium">
                            Improve Collection:
                          </span>{" "}
                          Focus on pending fee collections
                        </span>
                      </li>
                    )}
                    {occupancy.occupancyPercentage >= 90 && (
                      <li className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <span>
                          <span className="font-medium">
                            Consider Expansion:
                          </span>{" "}
                          High demand indicates need for additional capacity
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Slot</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {slot.name}? Existing students
              will remain enrolled, but no new students can join.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                    Important Considerations
                  </h4>
                  <ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-400">
                    <li>
                      • {occupancy.occupiedSeats} currently enrolled students
                      will remain
                    </li>
                    <li>• No new students can be assigned to this slot</li>
                    <li>• Monthly fees for existing students will continue</li>
                    <li>• Slot can be reactivated later if needed</li>
                    <li>
                      • This affects only new enrollments, not existing ones
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Impact Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Active Students:
                  </span>
                  <span>{activeStudents} will continue</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Monthly Revenue:
                  </span>
                  <span>
                    {formatCurrency(slot.monthlyFee * activeStudents)} will
                    continue
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lost Potential:</span>
                  <span>
                    {formatCurrency(slot.monthlyFee * occupancy.availableSeats)}{" "}
                    per month
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Deactivation
              </label>
              <Input
                placeholder="Enter reason (optional)"
                id="deactivate-reason"
                className="w-full"
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deactivate Slot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function for avatar colors
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
