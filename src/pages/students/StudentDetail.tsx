import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useParams,
  useNavigate,
  Link,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Home,
  UserCog,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  TrendingUp,
  FileText,
  MoreVertical,
  RefreshCw,
  Download,
  Archive,
  UserCheck,
  UserX,
  UserPlus,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { studentApi } from "@/api/students.api";
import { feeApi } from "@/api/fee.api";
import { slotApi } from "@/api/slot.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getMonthYear,
} from "@/lib/utils";
import type {
  Student,
  StudentStatus,
  FeeStatus,
  PaymentFormData,
} from "@/types/index";

export const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const initialTab = (() => {
    const tab = searchParams.get("tab");
    if (tab === "fees" || tab === "details" || tab === "overview") {
      return tab;
    }
    return "overview";
  })();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [archiveDialog, setArchiveDialog] = useState(false);
  const [reactivateDialog, setReactivateDialog] = useState(false);
  const [markPaymentDialog, setMarkPaymentDialog] = useState<{
    open: boolean;
    month?: number;
    year?: number;
  }>({ open: false });

  // Fetch student details
  const { data: studentData, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      if (!id) throw new Error("Student ID is required");
      const { data, error } = await studentApi.getStudentDetails(id);
      if (error) throw error;
      return data?.data;
    },
  });

  // Fetch fee summary
  const { data: feeSummary, refetch: refetchFeeSummary } = useQuery({
    queryKey: ["fee-summary", id],
    queryFn: async () => {
      if (!id) throw new Error("Student ID is required");
      const { data, error } = await feeApi.getFeeSummary(id);
      if (error) throw error;
      return data?.data;
    },
  });

  // Fetch slots for reference
  const { data: slotsData } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const { data, error } = await slotApi.getAllSlots();
      if (error) throw error;
      return data?.data;
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Student ID is required");
      const { error } = await studentApi.archiveStudent(
        id,
        "Archived from student detail page",
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      toast.success("Student archived successfully");
      setArchiveDialog(false);
      navigate("/students");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive student");
    },
  });

  // Reactivate mutation
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Student ID is required");
      const { error } = await studentApi.reactivateStudent(id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      toast.success("Student reactivated successfully");
      setReactivateDialog(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reactivate student");
    },
  });

  // Mark payment mutation
  const markPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      if (!id || !markPaymentDialog.month || !markPaymentDialog.year) {
        throw new Error("Missing payment details");
      }
      const { error } = await feeApi.markFeeAsPaid(
        id,
        markPaymentDialog.month,
        markPaymentDialog.year,
        paymentData,
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fee-summary", id] });
      toast.success("Payment recorded successfully");
      setMarkPaymentDialog({ open: false });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record payment");
    },
  });

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["student", id] });
    refetchFeeSummary();
    toast.success("Student data refreshed");
  };

  // Handle export
  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  // Handle download receipt
  const handleDownloadReceipt = async (month: number, year: number) => {
    try {
      const htmlBlob = await feeApi.downloadReceiptPDF(id!, month, year);
      const url = window.URL.createObjectURL(htmlBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${resolvedStudent?.name || id}-${month}-${year}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Receipt downloaded successfully");
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt");
    }
  };

  const resolvedStudent: Student | undefined =
    studentData && typeof studentData === "object" && "student" in studentData
      ? (studentData as { student: Student }).student
      : (studentData as Student | undefined);

  // Get slot details
  const slotDetails = slotsData?.find(
    (slot) => slot._id === resolvedStudent?.slotId,
  );

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    if (value === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    setSearchParams(params, { replace: true });
  };

  // Get status color and icon
  const getStatusInfo = (status: StudentStatus) => {
    switch (status) {
      case "ACTIVE":
        return {
          color:
            "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          icon: UserCheck,
          badgeVariant: "success" as const,
        };
      case "INACTIVE":
        return {
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
          icon: Clock,
          badgeVariant: "warning" as const,
        };
      case "ARCHIVED":
        return {
          color:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
          icon: Archive,
          badgeVariant: "secondary" as const,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800",
          icon: UserCog,
          badgeVariant: "secondary" as const,
        };
    }
  };

  // Get fee status color
  const getFeeStatusColor = (status: FeeStatus) => {
    switch (status) {
      case "PAID":
        return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
      case "DUE":
        return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
      case "PENDING":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/students")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Students
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
              <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
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

  if (!resolvedStudent) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Students
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <UserX className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Student not found</h3>
            <p className="text-muted-foreground mb-6">
              The student you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/students">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Students
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const student = resolvedStudent;
  const statusInfo = getStatusInfo(student.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/students")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {student.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={
                  statusInfo.badgeVariant === "success"
                    ? "default"
                    : statusInfo.badgeVariant === "warning"
                      ? "secondary"
                      : statusInfo.badgeVariant
                }
                className="gap-1"
              >
                <StatusIcon className="h-3 w-3" />
                {student.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Student ID: {student._id.slice(-8)}
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
            <DropdownMenuTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              {hasPermission("SUPER_ADMIN") && (
                <>
                  <DropdownMenuItem>
                    <Link
                      to={`/students/${student._id}/edit`}
                      className="flex items-center"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Student
                    </Link>
                  </DropdownMenuItem>

                  {student.status !== "ARCHIVED" ? (
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => setArchiveDialog(true)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive Student
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      className="text-green-600"
                      onClick={() => setReactivateDialog(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Reactivate Student
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleTabChange("fees")}>
                <CreditCard className="h-4 w-4 mr-2" />
                Payment History
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
                <p className="text-sm text-muted-foreground">Monthly Fee</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(student.monthlyFee)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="text-lg font-bold">
                  {formatDate(student.joiningDate)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(feeSummary?.totals?.totalPaid || 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Due</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(feeSummary?.totals?.totalDue || 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fees">Fee History</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Personal Info */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  Basic details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone Number
                    </label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{student.phone}</span>
                    </div>
                  </div>

                  {student.email && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Email
                      </label>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{student.email}</span>
                      </div>
                    </div>
                  )}

                  {student.fatherName && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Father's Name
                      </label>
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {student.fatherName}
                        </span>
                      </div>
                    </div>
                  )}

                  {student.address && (
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Address
                      </label>
                      <div className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="font-medium">{student.address}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Library Info */}
                <div className="space-y-4">
                  <h4 className="font-medium">Library Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Slot
                      </label>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {slotDetails?.name || "N/A"}
                        </span>
                        {slotDetails && (
                          <Badge variant="outline">
                            {slotDetails.timeRange.start} -{" "}
                            {slotDetails.timeRange.end}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {student.seatNumber && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-muted-foreground">
                          Seat Number
                        </label>
                        <div className="font-medium">{student.seatNumber}</div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Monthly Fee
                      </label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(student.monthlyFee)}
                        </span>
                        {student.feeOverride && (
                          <Badge variant="secondary">Overridden</Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Joining Date
                      </label>
                      <div className="font-medium">
                        {formatDate(student.joiningDate)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {student.tags && student.tags.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {student.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>Fee payment overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Paid</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(feeSummary?.totals?.totalPaid || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Due</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(feeSummary?.totals?.totalDue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Pending</span>
                    <span className="font-bold text-yellow-600">
                      {formatCurrency(feeSummary?.totals?.totalPending || 0)}
                    </span>
                  </div>

                  <Separator />

                  {/* Advance Balance */}
                  {feeSummary?.advance && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Advance Balance
                        </span>
                        <span className="font-bold">
                          {formatCurrency(feeSummary.advance.remainingAmount)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total: {formatCurrency(feeSummary.advance.totalAmount)}
                      </div>
                      {feeSummary.advance.monthsCovered.length > 0 && (
                        <div className="text-xs">
                          Applied to: {feeSummary.advance.monthsCovered.length}{" "}
                          months
                        </div>
                      )}
                    </div>
                  )}

                  {/* Due Record */}
                  {feeSummary?.due && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Overdue Amount
                        </span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(feeSummary.due.totalDueAmount)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Due for: {feeSummary.due.monthsDue.length} months
                      </div>
                      <div className="text-xs">
                        Next reminder: {formatDate(feeSummary.due.reminderDate)}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Link to={`/fees?studentId=${student._id}`}>
                    <Button className="w-full" variant="default">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Manage Fees
                    </Button>
                  </Link>
                  {hasPermission("SUPER_ADMIN") && (
                    <Button variant="outline" className="w-full">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Add Advance
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feeSummary?.feeHistory.slice(0, 5).map((fee, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${getFeeStatusColor(
                          fee.status,
                        )}`}
                      >
                        {fee.status === "PAID" ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : fee.status === "DUE" ? (
                          <AlertCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {getMonthYear(fee.month, fee.year)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(fee.totalAmount)} • {fee.status}
                          {fee.coveredByAdvance && " • Covered by Advance"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {formatCurrency(fee.totalAmount)}
                      </div>
                      {fee.paymentDate && (
                        <div className="text-sm text-muted-foreground">
                          {formatRelativeTime(fee.paymentDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {(!feeSummary?.feeHistory ||
                  feeSummary.feeHistory.length === 0) && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">
                      No fee history available
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees Tab */}
        <TabsContent value="fees" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Fee History</CardTitle>
                  <CardDescription>
                    Complete payment history and status
                  </CardDescription>
                </div>
                {hasPermission("SUPER_ADMIN") && (
                  <Button
                    onClick={() =>
                      navigate(`/fees/mark-payment?studentId=${student._id}`)
                    }
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Mark Payment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Base Fee</TableHead>
                      <TableHead>Due Carried</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeSummary?.feeHistory.map((fee, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {getMonthYear(fee.month, fee.year)}
                        </TableCell>
                        <TableCell>{formatCurrency(fee.baseFee)}</TableCell>
                        <TableCell>
                          {formatCurrency(fee.dueCarriedForward)}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold">
                            {formatCurrency(fee.totalAmount)}
                          </div>
                          {fee.coveredByAdvance && (
                            <div className="text-xs text-green-600">
                              Advance Applied
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              fee.status === "PAID"
                                ? "default"
                                : fee.status === "DUE"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {fee.status}
                          </Badge>
                          {fee.locked && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Locked
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {fee.paymentDate ? formatDate(fee.paymentDate) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white"
                            >
                              {hasPermission("SUPER_ADMIN") && !fee.locked && (
                                <>
                                  {fee.status !== "PAID" && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setMarkPaymentDialog({
                                          open: true,
                                          month: fee.month,
                                          year: fee.year,
                                        })
                                      }
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}
                                  {fee.status !== "DUE" && (
                                    <DropdownMenuItem>
                                      <AlertCircle className="h-4 w-4 mr-2" />
                                      Mark as Due
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {fee.status === "PAID" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleDownloadReceipt(fee.month, fee.year)
                                  }
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Receipt
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}

                    {(!feeSummary?.feeHistory ||
                      feeSummary.feeHistory.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <h3 className="font-semibold mb-2">
                            No fee records found
                          </h3>
                          <p className="text-muted-foreground">
                            Fee records will appear here when monthly fees are
                            generated.
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

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  Administrative and system details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Student ID</span>
                    <code className="font-mono">{student._id}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{formatDate(student.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span>{formatDate(student.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created By</span>
                    <span>Admin {student.createdBy?.slice(-6)}</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium">Registration Notes</h4>
                  {student.notes ? (
                    <div className="text-sm bg-muted p-3 rounded-lg">
                      {student.notes}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No notes provided
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fee Structure */}
            <Card>
              <CardHeader>
                <CardTitle>Fee Structure</CardTitle>
                <CardDescription>Current fee configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Standard Slot Fee
                    </span>
                    <span>{formatCurrency(slotDetails?.monthlyFee || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Current Monthly Fee
                    </span>
                    <div className="text-right">
                      <div className="font-bold">
                        {formatCurrency(student.monthlyFee)}
                      </div>
                      {student.feeOverride && (
                        <div className="text-xs text-yellow-600">
                          Custom fee applied
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Advance Balance */}
                  {feeSummary?.advance && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Advance Balance
                        </span>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatCurrency(feeSummary.advance.remainingAmount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            of {formatCurrency(feeSummary.advance.totalAmount)}{" "}
                            total
                          </div>
                        </div>
                      </div>
                      {feeSummary.advance.monthsCovered.length > 0 && (
                        <div className="text-sm">
                          <div className="font-medium mb-1">
                            Months Covered:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {feeSummary.advance.monthsCovered.map(
                              (month, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {month}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {hasPermission("SUPER_ADMIN") && (
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Override Monthly Fee
                    </Button>
                    <Button variant="outline" className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Advance Payment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Archive Dialog */}
      <Dialog open={archiveDialog} onOpenChange={setArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {student.name}? Archived students
              will be moved to the archived section and their slot will be freed
              up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Important Notes</h4>
              <ul className="text-sm space-y-1">
                <li>• Student will be moved to Archived status</li>
                <li>• Their slot will become available for other students</li>
                <li>• Fee records will be preserved</li>
                <li>• Student can be reactivated later if needed</li>
                <li>• This action cannot be undone automatically</li>
              </ul>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Archival
              </label>
              <Input
                placeholder="Enter reason (optional)"
                id="archive-reason"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => archiveMutation.mutate()}
              loading={archiveMutation.isPending}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog open={reactivateDialog} onOpenChange={setReactivateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Student</DialogTitle>
            <DialogDescription>
              Reactivate {student.name} to make them active again. You'll need
              to assign them to an available slot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium mb-2 text-green-700 dark:text-green-400">
                Reactivation Details
              </h4>
              <ul className="text-sm space-y-1 text-green-700 dark:text-green-400">
                <li>• Student will be moved to Active status</li>
                <li>• You'll need to select an available slot</li>
                <li>• Previous fee records will remain intact</li>
                <li>• Monthly fees will resume from next cycle</li>
              </ul>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Slot for Reactivation
              </label>
              <Select
                defaultValue={
                  typeof student.slotId === "string"
                    ? student.slotId
                    : student.slotId?._id
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a slot" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {slotsData
                    ?.filter((slot) => slot.isActive && slot.availableSeats > 0)
                    .map((slot) => (
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
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReactivateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => reactivateMutation.mutate()}
              disabled={reactivateMutation.isPending}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Reactivate Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Payment Dialog */}
      <Dialog
        open={markPaymentDialog.open}
        onOpenChange={(open) => setMarkPaymentDialog({ open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payment</DialogTitle>
            <DialogDescription>
              Record payment for{" "}
              {markPaymentDialog.month !== undefined &&
              markPaymentDialog.year !== undefined
                ? getMonthYear(markPaymentDialog.month, markPaymentDialog.year)
                : "selected month"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select defaultValue="CASH">
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction ID</label>
                <Input placeholder="Optional transaction ID" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Textarea placeholder="Any additional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkPaymentDialog({ open: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                markPaymentMutation.mutate({
                  method: "CASH",
                  transactionId: "",
                  remarks: "",
                })
              }
              loading={markPaymentMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
