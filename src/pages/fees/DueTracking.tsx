import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Clock,
  User,
  Search,
  RefreshCw,
  Download,
  MoreVertical,
  CheckCircle,
  Bell,
  Mail,
  Phone,
  X,
  Send,
  FileText,
  CreditCard, // Make sure this is imported
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { feeApi } from "@/api/fee.api";
import { studentApi } from "@/api/students.api";
import { notificationApi } from "@/api/notifications.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  formatCurrency,
  formatDate,
  getMonthName,
  calculateDaysDifference,
} from "@/lib/utils";

export const DueTracking: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "overdue" | "pending"
  >("overdue");
  const [daysFilter, setDaysFilter] = useState<"all" | "7" | "15" | "30">(
    "all",
  );
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overdue");

  // Fetch dashboard payment status for current month
  const {
    data: paymentData,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["payment-status"],
    queryFn: async () => {
      const { data, error } = await feeApi.getDashboardPaymentStatus();
      if (error) throw error;
      return data?.data;
    },
  });

  // Fetch students for details
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await studentApi.searchStudents({ limit: 1000 });
      if (error) throw error;
      return data?.data;
    },
  });

  // Filter due records
  const dueRecords = React.useMemo(() => {
    if (!paymentData?.details) return [];

    return paymentData.details
      .filter((fee) => fee.status === "DUE")
      .map((fee) => {
        const student = studentsData?.students?.find(
          (s) => s._id === fee.studentId,
        );
        const dueDate = new Date(fee.year, fee.month + 1, 0); // Last day of the month
        const today = new Date();
        const daysOverdue = calculateDaysDifference(dueDate, today);

        return {
          ...fee,
          studentName: fee.studentName,
          phone: student?.phone,
          email: student?.email,
          dueDate,
          daysOverdue,
          urgency:
            daysOverdue > 30
              ? "critical"
              : daysOverdue > 15
                ? "high"
                : "medium",
        };
      })
      .filter((record) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          if (
            !record.studentName.toLowerCase().includes(query) &&
            !record.phone?.toLowerCase().includes(query)
          ) {
            return false;
          }
        }

        // Days filter
        if (daysFilter !== "all") {
          const days = parseInt(daysFilter);
          if (record.daysOverdue < days) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue); // Sort by most overdue first
  }, [paymentData, studentsData, searchQuery, daysFilter]);

  // Calculate summary
  const summary = React.useMemo(() => {
    if (!dueRecords.length)
      return {
        totalAmount: 0,
        averageOverdue: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
      };

    const totalAmount = dueRecords.reduce(
      (sum, record) => sum + record.totalAmount,
      0,
    );
    const averageOverdue =
      dueRecords.reduce((sum, record) => sum + record.daysOverdue, 0) /
      dueRecords.length;
    const criticalCount = dueRecords.filter(
      (r) => r.urgency === "critical",
    ).length;
    const highCount = dueRecords.filter((r) => r.urgency === "high").length;
    const mediumCount = dueRecords.filter((r) => r.urgency === "medium").length;

    return {
      totalAmount,
      averageOverdue,
      criticalCount,
      highCount,
      mediumCount,
    };
  }, [dueRecords]);

  // Mutation for sending reminder
  const sendReminderMutation = useMutation({
    mutationFn: async ({
      studentId,
      channel,
    }: {
      studentId: string;
      channel: "email" | "sms" | "push" | "in-app" | "all";
    }) => {
      // Call the actual notification API with custom message for due payments
      return notificationApi.sendDirectNotification({
        studentId,
        channel,
        title: "Payment Reminder",
        message: `You have overdue library fees. Please clear your dues at the earliest to avoid service interruption.`,
      });
    },
    onSuccess: () => {
      toast.success("Reminder sent successfully");
      setIsReminderDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to send reminder: ${error.message}`);
    },
  });

  // Mutation for marking as paid (using the parameters)
  const markAsPaidMutation = useMutation({
    mutationFn: async ({
      studentId,
      month,
      year,
    }: {
      studentId: string;
      month: number;
      year: number;
    }) => {
      // This would call the actual API
      console.log(
        `Marking fee as paid for student ${studentId}, month ${month}, year ${year}`,
      );
      toast.info("Marking as paid functionality coming soon");
      return Promise.resolve();
    },
    onSuccess: () => {
      toast.success("Marked as paid successfully");
      setIsMarkPaidDialogOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });

  // Handle send reminder
  const handleSendReminder = (
    studentId: string,
    channel: "email" | "sms" | "push" | "in-app" | "all",
  ) => {
    sendReminderMutation.mutate({ studentId, channel });
  };

  // Handle mark as paid
  const handleMarkAsPaid = (studentId: string, month: number, year: number) => {
    markAsPaidMutation.mutate({ studentId, month, year });
  };

  // Handle export
  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Due Tracking</h1>
            <p className="text-muted-foreground">Loading due records...</p>
          </div>
        </div>

        {/* Skeleton loader */}
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Due Tracking</h1>
          <p className="text-muted-foreground">
            Track and manage overdue fee payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          {hasPermission("SUPER_ADMIN") && (
            <Button onClick={() => toast.info("Bulk actions coming soon")}>
              <Send className="h-4 w-4 mr-2" />
              Bulk Actions
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Overdue</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalAmount)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span>From {dueRecords.length} students</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Days Overdue
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(summary.averageOverdue)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span>Average delay</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Critical Cases
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {summary.criticalCount}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span>Over 30 days overdue</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.highCount}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span>15-30 days overdue</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overdue">Overdue Fees</TabsTrigger>
          <TabsTrigger value="reminders">Reminder History</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overdue Fees Tab */}
        <TabsContent value="overdue" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>Filter overdue fee records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student name or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-3"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Days Filter */}
                <div className="w-full sm:w-auto">
                  <Select
                    value={daysFilter}
                    onValueChange={(value: "all" | "7" | "15" | "30") =>
                      setDaysFilter(value)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Days Overdue" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Overdue</SelectItem>
                      <SelectItem value="7">7+ days overdue</SelectItem>
                      <SelectItem value="15">15+ days overdue</SelectItem>
                      <SelectItem value="30">30+ days overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Urgency Filter */}
                <div className="w-full sm:w-auto">
                  <Select
                    value={statusFilter}
                    onValueChange={(value: "all" | "overdue" | "pending") =>
                      setStatusFilter(value)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="overdue">Critical</SelectItem>
                      <SelectItem value="pending">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Due Records */}
          <Card>
            <CardHeader>
              <CardTitle>Overdue Fee Records</CardTitle>
              <CardDescription>
                Showing {dueRecords.length} overdue fee records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dueRecords.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    No overdue fees!
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    All fees are up to date
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden space-y-4">
                    {dueRecords.map((record) => (
                      <Card
                        key={`${record.studentId}-${record.month}-${record.year}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">
                                {record.studentName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {record.phone}
                              </p>
                            </div>
                            <Badge
                              variant={
                                record.urgency === "critical"
                                  ? "destructive"
                                  : record.urgency === "high"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {record.urgency.toUpperCase()}
                            </Badge>
                          </div>

                          <Separator className="my-3" />

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Month
                              </span>
                              <span>
                                {getMonthName(record.month)} {record.year}
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Amount Due
                              </span>
                              <span className="font-bold text-red-600">
                                {formatCurrency(record.totalAmount)}
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Days Overdue
                              </span>
                              <span className="font-medium">
                                {record.daysOverdue} days
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Due Date
                              </span>
                              <span>{formatDate(record.dueDate)}</span>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                setSelectedStudent(record.studentId);
                                setIsReminderDialogOpen(true);
                              }}
                            >
                              <Bell className="h-3 w-3 mr-1" />
                              Remind
                            </Button>
                            {hasPermission("SUPER_ADMIN") && (
                              <Button
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedStudent(record.studentId);
                                  setIsMarkPaidDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Amount Due</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Days Overdue</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dueRecords.map((record) => (
                          <TableRow
                            key={`${record.studentId}-${record.month}-${record.year}`}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                </div>
                                <div>
                                  <div>{record.studentName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {record.phone}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getMonthName(record.month)} {record.year}
                            </TableCell>
                            <TableCell className="font-bold text-red-600">
                              {formatCurrency(record.totalAmount)}
                            </TableCell>
                            <TableCell>{formatDate(record.dueDate)}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.daysOverdue > 30
                                    ? "destructive"
                                    : record.daysOverdue > 15
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {record.daysOverdue} days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.urgency === "critical"
                                    ? "destructive"
                                    : record.urgency === "high"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {record.urgency.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="bg-white"
                                >
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(`/students/${record.studentId}`)
                                    }
                                  >
                                    <User className="h-4 w-4 mr-2" />
                                    View Student
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedStudent(record.studentId);
                                      setIsReminderDialogOpen(true);
                                    }}
                                  >
                                    <Bell className="h-4 w-4 mr-2" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedStudent(record.studentId);
                                      navigate(
                                        `/fees/mark-payment?studentId=${record.studentId}&month=${record.month}&year=${record.year}`,
                                      );
                                    }}
                                  >
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Record Payment
                                  </DropdownMenuItem>
                                  {hasPermission("SUPER_ADMIN") && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedStudent(record.studentId);
                                        setIsMarkPaidDialogOpen(true);
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reminder History Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reminder History</CardTitle>
              <CardDescription>
                Track sent reminders and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Reminder History</h3>
                <p className="text-muted-foreground mb-6">
                  Reminder history functionality coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Reports</CardTitle>
              <CardDescription>
                Generate and view overdue fee reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="font-semibold mb-2">Generate Report</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Generate detailed overdue fee report
                      </p>
                      <Button className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Generate PDF Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="font-semibold mb-2">Email Reports</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        Send overdue reports via email
                      </p>
                      <Button variant="outline" className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Send Email Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reminder Dialog */}
      <Dialog
        open={isReminderDialogOpen}
        onOpenChange={setIsReminderDialogOpen}
      >
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Send Reminder</DialogTitle>
            <DialogDescription>
              Send payment reminder to student
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 ">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() =>
                  handleSendReminder(selectedStudent || "", "email")
                }
                disabled={sendReminderMutation.isPending}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSendReminder(selectedStudent || "", "sms")}
                disabled={sendReminderMutation.isPending}
              >
                <Phone className="h-4 w-4 mr-2" />
                SMS
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() =>
                  handleSendReminder(selectedStudent || "", "push")
                }
                disabled={sendReminderMutation.isPending}
              >
                <Bell className="h-4 w-4 mr-2" />
                Push Notification
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSendReminder(selectedStudent || "", "all")}
                disabled={sendReminderMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                All Channels
              </Button>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsReminderDialogOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog
        open={isMarkPaidDialogOpen}
        onOpenChange={setIsMarkPaidDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Mark overdue fee as paid without recording payment details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will mark the fee as paid without recording payment details.
              Use this only when payment has been received but details are not
              available.
            </p>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Warning</span>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-500 mt-1">
                This action cannot be undone. Make sure payment has been
                received.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsMarkPaidDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (selectedStudent) {
                    handleMarkAsPaid(
                      selectedStudent,
                      new Date().getMonth(),
                      new Date().getFullYear(),
                    );
                  }
                }}
                disabled={markAsPaidMutation.isPending}
              >
                {markAsPaidMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
