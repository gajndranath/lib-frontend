import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  IndianRupee,
  Download,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useDashboardData,
  useUpdatePayment,
  useExportData,
} from "@/hooks/useStudents";
import { useSocket } from "@/hooks/useSocket";
import { PaymentStatus, type DashboardStudent } from "@/types/api.types";

export const DashboardPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Remove unused queryClient or use it
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useDashboardData(selectedMonth, selectedYear);
  const updatePayment = useUpdatePayment();
  const exportData = useExportData();
  const { isConnected, emitDashboardSync } = useSocket();

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  // Socket event for dashboard updates
  useEffect(() => {
    const handleDashboardUpdate = () => {
      refetch();
      toast.info("Dashboard updated in real-time");
    };

    // Listen for dashboard updates
    window.addEventListener("dashboard_updated", handleDashboardUpdate);

    return () => {
      window.removeEventListener("dashboard_updated", handleDashboardUpdate);
    };
  }, [refetch]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    emitDashboardSync(selectedMonth, selectedYear);
    setIsRefreshing(false);
    toast.success("Dashboard refreshed");
  };

  const handlePaymentToggle = (
    studentId: string,
    currentStatus: PaymentStatus | "NOT_GENERATED" // Add NOT_GENERATED type
  ) => {
    // Handle NOT_GENERATED case - treat it as UNPAID
    if (currentStatus === "NOT_GENERATED") {
      updatePayment.mutate({
        studentId,
        month: selectedMonth,
        year: selectedYear,
        status: "PAID" as PaymentStatus,
      });
      return;
    }

    const newStatus = (
      currentStatus === "PAID" ? "UNPAID" : "PAID"
    ) as PaymentStatus;

    updatePayment.mutate({
      studentId,
      month: selectedMonth,
      year: selectedYear,
      status: newStatus,
    });
  };

  const handleExport = () => {
    exportData.mutate({ month: selectedMonth, year: selectedYear });
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(selectedYear, i, 1), "MMMM"),
  }));

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i;
    return { value: year, label: year.toString() };
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <p className="text-red-700">Failed to load dashboard data</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { students = [], summary } = dashboardData || {};

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Overview of all students and payments for{" "}
            {format(new Date(selectedYear, selectedMonth), "MMMM yyyy")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-32 border-0 p-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-24 border-0 p-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year.value} value={year.value.toString()}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={exportData.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2">
        <div
          className={`h-2 w-2 rounded-full ${
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          }`}
        />
        <span className="text-sm text-gray-600">
          {isConnected
            ? "Connected - Real-time updates active"
            : "Disconnected - Updates may be delayed"}
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Students"
          value={summary?.totalStudents || 0}
          icon={<Users className="h-5 w-5" />}
          color="bg-blue-500"
          trend="+2 this month"
        />

        <SummaryCard
          title="Paid Students"
          value={summary?.paidStudents || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          color="bg-green-500"
          trend={`${
            summary?.paidStudents && summary?.totalStudents
              ? Math.round((summary.paidStudents / summary.totalStudents) * 100)
              : 0
          }% paid`}
        />

        <SummaryCard
          title="Pending Students"
          value={summary?.pendingStudents || 0}
          icon={<Clock className="h-5 w-5" />}
          color="bg-yellow-500"
          trend="Action required"
        />

        <SummaryCard
          title="Overdue Students"
          value={summary?.overdueStudents || 0}
          icon={<AlertCircle className="h-5 w-5" />}
          color="bg-red-500"
          trend="Follow up needed"
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Expected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              <span className="text-2xl font-bold">
                {(summary?.totalExpected || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              <span className="text-2xl font-bold text-green-600">
                {(summary?.totalReceived || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pending Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5" />
              <span className="text-2xl font-bold text-red-600">
                {(summary?.totalPending || 0).toLocaleString("en-IN")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Students List</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Click on payment status to toggle between Paid/Unpaid
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {students.length} Students
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Monthly Fees</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-gray-500"
                      >
                        No students found for this month
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((student: DashboardStudent) => (
                      <TableRow key={student._id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        <TableCell className="font-mono">
                          {student.phone}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {student.monthlyFees}
                          </div>
                        </TableCell>
                        <TableCell>
                          <PaymentStatusBadge
                            status={student.paymentStatus}
                            onClick={() =>
                              handlePaymentToggle(
                                student._id,
                                student.paymentStatus
                              )
                            }
                            disabled={updatePayment.isPending}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {student.dueAmount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={
                                student.paymentStatus === "PAID"
                                  ? "outline"
                                  : "default"
                              }
                              onClick={() =>
                                handlePaymentToggle(
                                  student._id,
                                  student.paymentStatus
                                )
                              }
                              disabled={updatePayment.isPending}
                            >
                              {student.paymentStatus === "PAID"
                                ? "Mark Unpaid"
                                : "Mark Paid"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                // Navigate to student details
                                window.location.href = `/students/${student._id}`;
                              }}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Table Footer */}
          {students.length > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 text-sm text-gray-500">
              <div className="mb-2 md:mb-0">
                Showing {students.length} students
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span>Paid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span>Unpaid</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span>Partial</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Generate Monthly Report
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Receipts
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <AlertCircle className="mr-2 h-4 w-4" />
              Send Reminders
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Payment marked as paid</span>
                <span className="text-xs text-gray-500">2 min ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">New student added</span>
                <span className="text-xs text-gray-500">10 min ago</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Reminder sent</span>
                <span className="text-xs text-gray-500">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper Components
const SummaryCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend: string;
}> = ({ title, value, icon, color, trend }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{trend}</p>
        </div>
        <div className={`${color} p-3 rounded-full text-white`}>{icon}</div>
      </div>
    </CardContent>
  </Card>
);

const PaymentStatusBadge: React.FC<{
  status: PaymentStatus | "NOT_GENERATED";
  onClick?: () => void;
  disabled?: boolean;
}> = ({ status, onClick, disabled }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "PAID":
        return {
          color: "bg-green-100 text-green-800 hover:bg-green-200",
          label: "Paid",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "UNPAID":
        return {
          color: "bg-red-100 text-red-800 hover:bg-red-200",
          label: "Unpaid",
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
        };
      case "PARTIAL":
        return {
          color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
          label: "Partial",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      case "ADVANCE":
        return {
          color: "bg-blue-100 text-blue-800 hover:bg-blue-200",
          label: "Advance",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "NOT_GENERATED":
        return {
          color: "bg-gray-100 text-gray-800 hover:bg-gray-200",
          label: "Not Generated",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
      default:
        // Handle any other status gracefully
        return {
          color: "bg-gray-100 text-gray-800 hover:bg-gray-200",
          label: status as string,
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge
      className={`${config.color} cursor-pointer transition-colors ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={disabled ? undefined : onClick}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
};

const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6 p-6">
    <div className="flex justify-between items-center">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-10 w-48" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20 mt-2" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);
