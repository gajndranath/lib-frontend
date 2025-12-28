import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  Filter,
  IndianRupee,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAPI } from "@/api/admin.api";
import { StudentsAPI } from "@/api/students.api";
import { useExportData } from "@/hooks/useStudents";
import { PaymentStatus } from "@/types/api.types";
import { queryKeys } from "@/lib/queryClient";

// Define types for our data
type ChartDataPoint = {
  name: string;
  month?: number;
  year?: number;
  expected?: number;
  received?: number;
  pending?: number;
  value?: number;
  color?: string;
};

type StatusDistribution = {
  name: string;
  value: number;
  color: string;
};

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<
    "monthly" | "yearly" | "student"
  >("monthly");
  const [timeRange, setTimeRange] = useState<
    "current" | "last" | "quarter" | "custom"
  >("current");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  // Fetch monthly report
  const { data: monthlyReport, isLoading: monthlyLoading } = useQuery({
    queryKey: queryKeys.analytics.monthly(selectedMonth, selectedYear),
    queryFn: () => AdminAPI.getMonthlyReport(selectedMonth, selectedYear),
    enabled: reportType === "monthly",
  });

  // Remove unused yearlyReport query or use it
  const { isLoading: yearlyLoading } = useQuery({
    queryKey: queryKeys.analytics.yearly(selectedYear),
    queryFn: () => AdminAPI.getMonthlyReport(0, selectedYear),
    enabled: reportType === "yearly",
  });

  // Fetch dashboard data for student reports
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: queryKeys.students.dashboard(selectedMonth, selectedYear),
    queryFn: () => StudentsAPI.getDashboardData(selectedMonth, selectedYear),
    enabled: reportType === "student",
  });

  const exportData = useExportData();

  const isLoading = monthlyLoading || yearlyLoading || dashboardLoading;

  // Prepare yearly chart data using useMemo - remove selectedYear dependency
  const yearlyChartData = useMemo(() => {
    const months: ChartDataPoint[] = [];
    const today = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = subMonths(today, i);
      const month = date.getMonth();
      const year = date.getFullYear();

      // Use deterministic values instead of Math.random
      // This is mock data - replace with actual API data when available
      const baseValue = (month + 1) * 1000; // Deterministic based on month
      const expected = baseValue * 5; // Expected is 5x base
      const received = Math.floor(expected * 0.85); // 85% of expected
      const pending = expected - received;

      months.push({
        name: format(date, "MMM"),
        month,
        year,
        expected,
        received,
        pending,
      });
    }

    return months;
  }, []); // Remove selectedYear dependency - it's not used in the calculation
  const handleExport = () => {
    exportData.mutate({ month: selectedMonth, year: selectedYear });
  };

  const handleTimeRangeChange = (
    range: "current" | "last" | "quarter" | "custom"
  ) => {
    setTimeRange(range);
    const today = new Date();

    if (range === "current") {
      setSelectedMonth(today.getMonth());
      setSelectedYear(today.getFullYear());
    } else if (range === "last") {
      const lastMonth = subMonths(today, 1);
      setSelectedMonth(lastMonth.getMonth());
      setSelectedYear(lastMonth.getFullYear());
    } else if (range === "quarter") {
      // Set to first month of current quarter
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      setSelectedMonth(quarterStartMonth);
      setSelectedYear(today.getFullYear());
    }
    // custom case doesn't need to set anything
  };

  // Prepare data for charts
  const prepareMonthlyChartData = (): ChartDataPoint[] => {
    if (!monthlyReport) return [];

    return [
      {
        name: "Expected",
        value: monthlyReport.totalExpected || 0,
        color: "#3b82f6",
      },
      {
        name: "Received",
        value: monthlyReport.totalReceived || 0,
        color: "#10b981",
      },
      {
        name: "Pending",
        value: monthlyReport.pendingAmount || 0,
        color: "#f59e0b",
      },
    ];
  };

  const prepareStudentDistributionData = (): StatusDistribution[] => {
    if (!dashboardData?.students) return [];

    const statusCount: Record<string, number> = {
      PAID: 0,
      UNPAID: 0,
      PARTIAL: 0,
      ADVANCE: 0,
      NOT_GENERATED: 0,
    };

    dashboardData.students.forEach((student) => {
      const status = student.paymentStatus as keyof typeof statusCount;
      if (status in statusCount) {
        statusCount[status] = (statusCount[status] || 0) + 1;
      }
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      name: status,
      value: count,
      color: getStatusColor(status as PaymentStatus | "NOT_GENERATED"),
    }));
  };

  const getStatusColor = (status: PaymentStatus | "NOT_GENERATED"): string => {
    switch (status) {
      case "PAID":
        return "#10b981";
      case "UNPAID":
        return "#ef4444";
      case "PARTIAL":
        return "#f59e0b";
      case "ADVANCE":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };

  const monthlyChartData = prepareMonthlyChartData();
  const studentDistributionData = prepareStudentDistributionData();

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Analytics & Reports
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive insights and analytics for better decision making
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportData.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold mt-2">
                  <IndianRupee className="inline h-5 w-5" />
                  {monthlyReport?.totalReceived?.toLocaleString("en-IN") || "0"}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  <TrendingUp className="inline h-3 w-3 mr-1" />
                  +12% from last month
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full text-green-600">
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
                  Active Students
                </p>
                <p className="text-2xl font-bold mt-2">
                  {dashboardData?.summary?.totalStudents || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Currently enrolled</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Collection Rate
                </p>
                <p className="text-2xl font-bold mt-2">
                  {monthlyReport && monthlyReport.totalExpected
                    ? `${Math.round(
                        ((monthlyReport.totalReceived || 0) /
                          monthlyReport.totalExpected) *
                          100
                      )}%`
                    : "0%"}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  <TrendingDown className="inline h-3 w-3 mr-1" />
                  -3% from target
                </p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
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
                <p className="text-2xl font-bold mt-2">
                  <IndianRupee className="inline h-5 w-5" />
                  {monthlyReport?.pendingAmount?.toLocaleString("en-IN") || "0"}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  <AlertCircle className="inline h-3 w-3 mr-1" />
                  {dashboardData?.summary?.unpaidStudents || 0} students
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full text-red-600">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Tabs
              value={reportType}
              onValueChange={(v) =>
                setReportType(v as "monthly" | "yearly" | "student")
              }
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 w-full md:w-auto">
                <TabsTrigger value="monthly">
                  <Calendar className="h-4 w-4 mr-2" />
                  Monthly
                </TabsTrigger>
                <TabsTrigger value="yearly">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Yearly
                </TabsTrigger>
                <TabsTrigger value="student">
                  <Users className="h-4 w-4 mr-2" />
                  Students
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <Select
                  value={timeRange}
                  onValueChange={(v) =>
                    handleTimeRangeChange(
                      v as "current" | "last" | "quarter" | "custom"
                    )
                  }
                >
                  <SelectTrigger className="border-0 p-0 h-auto bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="last">Last Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Select
                  value={chartType}
                  onValueChange={(v) =>
                    setChartType(v as "bar" | "line" | "pie")
                  }
                >
                  <SelectTrigger className="border-0 p-0 h-auto bg-transparent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">
                      <BarChart3 className="h-4 w-4 mr-2 inline" />
                      Bar Chart
                    </SelectItem>
                    <SelectItem value="line">
                      <LineChartIcon className="h-4 w-4 mr-2 inline" />
                      Line Chart
                    </SelectItem>
                    <SelectItem value="pie">
                      <PieChartIcon className="h-4 w-4 mr-2 inline" />
                      Pie Chart
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Report Content */}
      {isLoading ? (
        <ReportsSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Monthly Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                  {format(
                    new Date(selectedYear, selectedMonth, 1),
                    "MMMM yyyy"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [
                            `₹${Number(value).toLocaleString("en-IN")}`,
                            "Amount",
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="value" fill="#3b82f6" name="Amount (₹)" />
                      </BarChart>
                    ) : chartType === "line" ? (
                      <LineChart data={yearlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [
                            `₹${Number(value).toLocaleString("en-IN")}`,
                            "Amount",
                          ]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="expected"
                          stroke="#3b82f6"
                          name="Expected"
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="received"
                          stroke="#10b981"
                          name="Received"
                          strokeWidth={2}
                        />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={studentDistributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {studentDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Yearly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Yearly Trend</CardTitle>
                <CardDescription>
                  Monthly performance over the past year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [
                          `₹${Number(value).toLocaleString("en-IN")}`,
                          "Amount",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="received"
                        stroke="#10b981"
                        name="Received"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="expected"
                        stroke="#3b82f6"
                        name="Expected"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Stats & Details */}
          <div className="space-y-6">
            {/* Payment Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
                <CardDescription>Current month distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentDistributionData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.value}</span>
                        <Badge variant="outline" className="text-xs">
                          {dashboardData?.summary?.totalStudents
                            ? `${Math.round(
                                (item.value /
                                  dashboardData.summary.totalStudents) *
                                  100
                              )}%`
                            : "0%"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Students</CardTitle>
                <CardDescription>Highest paying students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.students
                    ?.filter((s) => s.paymentStatus === "PAID")
                    .slice(0, 5)
                    .map((student) => (
                      <div
                        key={student._id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-gray-500">
                            {student.phone}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            <IndianRupee className="inline h-3 w-3" />
                            {student.paidAmount || student.monthlyFees}
                          </div>
                          <div className="text-xs text-green-600">Paid</div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Expected</span>
                    <span className="font-bold">
                      <IndianRupee className="inline h-4 w-4" />
                      {monthlyReport?.totalExpected?.toLocaleString("en-IN") ||
                        "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Received</span>
                    <span className="font-bold text-green-600">
                      <IndianRupee className="inline h-4 w-4" />
                      {monthlyReport?.totalReceived?.toLocaleString("en-IN") ||
                        "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pending Amount</span>
                    <span className="font-bold text-red-600">
                      <IndianRupee className="inline h-4 w-4" />
                      {monthlyReport?.pendingAmount?.toLocaleString("en-IN") ||
                        "0"}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collection Rate</span>
                      <span className="font-bold">
                        {monthlyReport && monthlyReport.totalExpected
                          ? `${Math.round(
                              ((monthlyReport.totalReceived || 0) /
                                monthlyReport.totalExpected) *
                                100
                            )}%`
                          : "0%"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Revenue increased by 12%</p>
                      <p className="text-sm text-gray-500">
                        Compared to last month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {dashboardData?.summary?.unpaidStudents || 0} overdue
                        payments
                      </p>
                      <p className="text-sm text-gray-500">
                        Require immediate attention
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium">
                        {dashboardData?.summary?.paidStudents || 0} students
                        paid
                      </p>
                      <p className="text-sm text-gray-500">
                        Good payment rate this month
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportsSkeleton: React.FC = () => (
  <div className="space-y-6">
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
      <CardContent className="pt-6">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </div>
);
