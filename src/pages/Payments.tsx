import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  IndianRupee,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { StudentsAPI } from "@/api/students.api";
import { useUpdatePayment } from "@/hooks/useStudents";
import { PaymentStatus, type DashboardStudent } from "@/types/api.types";
import { queryKeys } from "@/lib/queryClient";

export const PaymentsPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth());
  const [yearFilter, setYearFilter] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedPayment, setSelectedPayment] =
    useState<DashboardStudent | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: queryKeys.students.dashboard(monthFilter, yearFilter),
    queryFn: () => StudentsAPI.getDashboardData(monthFilter, yearFilter),
  });

  const updatePayment = useUpdatePayment();

  // Filter students based on search and status
  const filteredStudents =
    dashboardData?.students?.filter((student) => {
      const matchesSearch =
        search === "" ||
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.phone.includes(search);

      const matchesStatus =
        statusFilter === "all" || student.paymentStatus === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];

  const handlePaymentToggle = (
    studentId: string,
    currentStatus: PaymentStatus | "NOT_GENERATED"
  ) => {
    // Handle NOT_GENERATED case - treat it as UNPAID
    if (currentStatus === "NOT_GENERATED") {
      updatePayment.mutate({
        studentId,
        month: monthFilter,
        year: yearFilter,
        status: "PAID" as PaymentStatus,
      });
      return;
    }

    const newStatus = (
      currentStatus === "PAID" ? "UNPAID" : "PAID"
    ) as PaymentStatus;

    updatePayment.mutate({
      studentId,
      month: monthFilter,
      year: yearFilter,
      status: newStatus,
    });
  };

  const handleViewDetails = (student: DashboardStudent) => {
    setSelectedPayment(student);
    setIsDetailsOpen(true);
  };

  const handleExport = () => {
    toast.info("Export feature coming soon");
  };

  const getPaymentStatusIcon = (status: PaymentStatus | "NOT_GENERATED") => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "UNPAID":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "PARTIAL":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "ADVANCE":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAmountColor = (status: PaymentStatus | "NOT_GENERATED") => {
    switch (status) {
      case "PAID":
        return "text-green-600";
      case "UNPAID":
        return "text-red-600";
      case "PARTIAL":
        return "text-yellow-600";
      default:
        return "text-gray-600";
    }
  };

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: format(new Date(yearFilter, i, 1), "MMMM"),
  }));

  // Generate year options
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Payments Management
          </h1>
          <p className="text-gray-600 mt-1">
            Track and manage all student payments
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Payments
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Expected
                </p>
                <p className="text-2xl font-bold mt-2">
                  <IndianRupee className="inline h-5 w-5" />
                  {dashboardData?.summary?.totalExpected?.toLocaleString(
                    "en-IN"
                  ) || "0"}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Received
                </p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  <IndianRupee className="inline h-5 w-5" />
                  {dashboardData?.summary?.totalReceived?.toLocaleString(
                    "en-IN"
                  ) || "0"}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Amount
                </p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  <IndianRupee className="inline h-5 w-5" />
                  {dashboardData?.summary?.totalPending?.toLocaleString(
                    "en-IN"
                  ) || "0"}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Paid Students
                </p>
                <p className="text-2xl font-bold mt-2">
                  {dashboardData?.summary?.paidStudents || 0} /{" "}
                  {dashboardData?.summary?.totalStudents || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData?.summary?.totalStudents
                    ? `${Math.round(
                        (dashboardData.summary.paidStudents /
                          dashboardData.summary.totalStudents) *
                          100
                      )}% paid`
                    : "0% paid"}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full text-purple-600">
                <User className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search payments by student name or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="ADVANCE">Advance</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Select
                  value={monthFilter.toString()}
                  onValueChange={(v) => setMonthFilter(parseInt(v))}
                >
                  <SelectTrigger className="border-0 p-0 h-auto bg-transparent w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem
                        key={month.value}
                        value={month.value.toString()}
                      >
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={yearFilter.toString()}
                  onValueChange={(v) => setYearFilter(parseInt(v))}
                >
                  <SelectTrigger className="border-0 p-0 h-auto bg-transparent w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>
                {format(new Date(yearFilter, monthFilter, 1), "MMMM yyyy")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{filteredStudents.length} Records</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <PaymentsTableSkeleton />
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
                <IndianRupee className="w-full h-full" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No payments found
              </h3>
              <p className="text-gray-500 mt-2">
                {search
                  ? "Try a different search term"
                  : "No payments recorded for this period"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Monthly Fees</TableHead>
                      <TableHead>Due Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student: DashboardStudent) => (
                      <TableRow key={student._id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-500">
                            {student.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {student.monthlyFees}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1 font-medium ${getAmountColor(
                              student.paymentStatus
                            )}`}
                          >
                            <IndianRupee className="h-4 w-4" />
                            {student.dueAmount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {student.paidAmount || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentStatusIcon(student.paymentStatus)}
                            <Badge
                              variant={
                                student.paymentStatus === "PAID"
                                  ? "default"
                                  : "outline"
                              }
                              className={
                                student.paymentStatus === "PAID"
                                  ? "bg-green-100 text-green-800"
                                  : ""
                              }
                            >
                              {student.paymentStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.paymentDate ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span className="text-sm">
                                {format(
                                  new Date(student.paymentDate),
                                  "dd/MM/yyyy"
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(student)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Payment History
                                </DropdownMenuItem>
                                {student.remarks && (
                                  <DropdownMenuItem>
                                    <span className="text-xs text-gray-500">
                                      Remarks: {student.remarks}
                                    </span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Student Name</span>
                  <span className="font-medium">{selectedPayment.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Phone Number</span>
                  <span className="font-mono">{selectedPayment.phone}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Monthly Fees</span>
                  <span className="font-medium">
                    <IndianRupee className="inline h-4 w-4" />
                    {selectedPayment.monthlyFees}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Due Amount</span>
                  <span className="font-medium">
                    <IndianRupee className="inline h-4 w-4" />
                    {selectedPayment.dueAmount}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Paid Amount</span>
                  <span className="font-medium">
                    <IndianRupee className="inline h-4 w-4" />
                    {selectedPayment.paidAmount || 0}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Status</span>
                  <Badge
                    variant={
                      selectedPayment.paymentStatus === "PAID"
                        ? "default"
                        : "outline"
                    }
                    className={
                      selectedPayment.paymentStatus === "PAID"
                        ? "bg-green-100 text-green-800"
                        : ""
                    }
                  >
                    {selectedPayment.paymentStatus}
                  </Badge>
                </div>

                {selectedPayment.paymentDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Payment Date</span>
                    <span className="text-sm">
                      {format(
                        new Date(selectedPayment.paymentDate),
                        "dd/MM/yyyy hh:mm a"
                      )}
                    </span>
                  </div>
                )}

                {selectedPayment.remarks && (
                  <div className="pt-3 border-t">
                    <span className="text-gray-600 block mb-2">Remarks</span>
                    <p className="text-sm bg-gray-50 p-3 rounded">
                      {selectedPayment.remarks}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="default"
                  onClick={() =>
                    handlePaymentToggle(
                      selectedPayment._id,
                      selectedPayment.paymentStatus
                    )
                  }
                  disabled={updatePayment.isPending}
                >
                  {selectedPayment.paymentStatus === "PAID"
                    ? "Mark as Unpaid"
                    : "Mark as Paid"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PaymentsTableSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between p-4 border rounded-lg"
      >
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);
