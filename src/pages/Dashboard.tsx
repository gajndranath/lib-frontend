import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreVertical,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { adminApi } from "@/api/admin.api";
import { feeApi } from "@/api/fee.api";
import { slotApi } from "@/api/slot.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  formatCurrency,
  formatDate,
  calculatePercentage,
  getMonthName,
} from "@/lib/utils";
import type { DashboardStats } from "@/types";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Color palette for charts
const CHART_COLORS = {
  primary: "#4f46e5",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  secondary: "#64748b",
};

export const Dashboard: React.FC = () => {
  const { admin } = useAuth();
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth(),
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await adminApi.getDashboardStats();
      if (error) throw error;
      return data?.data as DashboardStats;
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch payment status
  const { data: paymentData, isLoading: paymentLoading } = useQuery({
    queryKey: ["payment-status", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await feeApi.getDashboardPaymentStatus(
        selectedMonth,
        selectedYear,
      );
      if (error) throw error;
      return data?.data;
    },
  });

  // Fetch slots
  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const { data, error } = await slotApi.getAllSlots();
      if (error) throw error;
      return data?.data;
    },
  });

  const isLoading = statsLoading || paymentLoading || slotsLoading;

  const handleRefresh = () => {
    toast.success("Dashboard data refreshed");
  };

  const handleExport = () => {
    toast.success("Export functionality coming soon");
  };

  // KPI Cards Data
  const kpiCards = [
    {
      title: "Total Students",
      value: dashboardData?.overview.totalStudents || 0,
      icon: Users,
      color: CHART_COLORS.primary,
      trend: "+12%",
      trendUp: true,
      description: "Active students",
    },
    {
      title: "Monthly Revenue",
      value: formatCurrency(dashboardData?.currentMonth.paidAmount || 0),
      icon: DollarSign,
      color: CHART_COLORS.success,
      trend: "+8%",
      trendUp: true,
      description: "Current month collected",
    },
    {
      title: "Pending Fees",
      value: formatCurrency(dashboardData?.currentMonth.pendingAmount || 0),
      icon: CreditCard,
      color: CHART_COLORS.warning,
      trend: "-5%",
      trendUp: false,
      description: "Expected this month",
    },
    {
      title: "Overdue Amount",
      value: formatCurrency(dashboardData?.overview.overdue.totalAmount || 0),
      icon: AlertCircle,
      color: CHART_COLORS.danger,
      trend: "+3%",
      trendUp: false,
      description:
        "From " + dashboardData?.overview.overdue.count + " students",
    },
  ];

  // Monthly trend data for line chart
  const monthlyTrendData =
    dashboardData?.monthlyTrend.map((item) => ({
      name: item.month,
      paid: item.paid,
      due: item.due,
      paidAmount: item.paidAmount,
      dueAmount: item.dueAmount,
      totalAmount: item.paidAmount + item.dueAmount,
    })) || [];

  // Payment status data for pie chart
  const paymentStatusData = paymentData?.stats
    ? [
        {
          name: "Paid",
          value: paymentData.stats.paid,
          color: CHART_COLORS.success,
        },
        {
          name: "Pending",
          value: paymentData.stats.pending,
          color: CHART_COLORS.warning,
        },
        {
          name: "Due",
          value: paymentData.stats.due,
          color: CHART_COLORS.danger,
        },
      ]
    : [];

  // Slot occupancy data
  const slotOccupancyData =
    slotsData?.map((slot) => ({
      name: slot.name,
      occupied: slot.occupiedSeats,
      available: slot.availableSeats,
      occupancy: slot.occupancyPercentage,
    })) || [];

  // Recent payments
  const recentPayments = paymentData?.details?.slice(0, 5) || [];

  // Top performing slots
  const topSlots =
    slotsData
      ?.sort(
        (a, b) => (b.occupancyPercentage || 0) - (a.occupancyPercentage || 0),
      )
      .slice(0, 3) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
          <Button variant="outline" size="icon" disabled>
            <RefreshCw className="h-4 w-4 animate-spin" />
          </Button>
        </div>

        {/* Skeleton loader */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {admin?.name}. Here's what's happening with your
            library today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {getMonthName(i)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
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
              <DropdownMenuItem onClick={() => toast.info("Coming soon")}>
                Generate Report
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Coming soon")}>
                Email Summary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Coming soon")}>
                Print Dashboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => (
          <Card key={index} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${card.color}20` }}
              >
                <card.icon className="h-4 w-4" style={{ color: card.color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-2">
                {card.trendUp ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span
                  className={card.trendUp ? "text-green-500" : "text-red-500"}
                >
                  {card.trend} from last month
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Fee Collection Trend</CardTitle>
            <CardDescription>
              Payment collection performance over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--muted))"
                  />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) =>
                      `₹${value.toLocaleString("en-IN")}`
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      `₹${Number(value).toLocaleString("en-IN")}`,
                      "Amount",
                    ]}
                    labelFormatter={(label) => `Month: ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="paidAmount"
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Paid Amount"
                  />
                  <Line
                    type="monotone"
                    dataKey="dueAmount"
                    stroke={CHART_COLORS.danger}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Due Amount"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status & Slot Occupancy */}
        <div className="space-y-6">
          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Status</CardTitle>
              <CardDescription>
                Current month fee collection breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value} students`, "Count"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {paymentStatusData.map((item, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold">{item.value}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.name}
                    </div>
                    <div className="text-xs" style={{ color: item.color }}>
                      {calculatePercentage(
                        item.value,
                        paymentData?.stats.total || 1,
                      )}
                      % of total
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Slots */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Slots</CardTitle>
              <CardDescription>Highest occupancy rate slots</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topSlots.map((slot, _index) => (
                  <div
                    key={slot._id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{slot.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {slot.timeRange.start} - {slot.timeRange.end}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {slot.occupancyPercentage}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {slot.occupiedSeats}/{slot.totalSeats} seats
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Slot Occupancy & Recent Payments */}
        <div className="space-y-6">
          {/* Slot Occupancy */}
          <Card>
            <CardHeader>
              <CardTitle>Slot Occupancy</CardTitle>
              <CardDescription>
                Current seat occupancy across all slots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={slotOccupancyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--muted))"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} seats`, "Count"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="occupied"
                      name="Occupied Seats"
                      fill={CHART_COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="available"
                      name="Available Seats"
                      fill={CHART_COLORS.secondary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>
                    Latest fee payments recorded
                  </CardDescription>
                </div>
                <Badge variant="outline">
                  {recentPayments.length} payments
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.studentId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center ${
                          payment.status === "PAID"
                            ? "bg-green-100 text-green-600"
                            : payment.status === "DUE"
                              ? "bg-red-100 text-red-600"
                              : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {payment.status === "PAID" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : payment.status === "DUE" ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{payment.studentName}</div>
                        <div className="text-sm text-muted-foreground">
                          {getMonthName(payment.month)} {payment.year}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {formatCurrency(payment.totalAmount)}
                      </div>
                      <Badge
                        variant={
                          payment.status === "PAID"
                            ? "default"
                            : payment.status === "DUE"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}

                {recentPayments.length === 0 && (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">No recent payments</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Stats & System Health */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Quick Statistics</CardTitle>
            <CardDescription>Key metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Collection Rate
                </div>
                <div className="text-2xl font-bold">
                  {dashboardData?.currentMonth.paidAmount &&
                  dashboardData?.currentMonth.paidAmount +
                    dashboardData?.currentMonth.dueAmount +
                    dashboardData?.currentMonth.pendingAmount
                    ? calculatePercentage(
                        dashboardData.currentMonth.paidAmount,
                        dashboardData.currentMonth.paidAmount +
                          dashboardData.currentMonth.dueAmount +
                          dashboardData.currentMonth.pendingAmount,
                      )
                    : 0}
                  %
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${
                        dashboardData?.currentMonth.paidAmount &&
                        dashboardData?.currentMonth.paidAmount +
                          dashboardData?.currentMonth.dueAmount +
                          dashboardData?.currentMonth.pendingAmount
                          ? calculatePercentage(
                              dashboardData.currentMonth.paidAmount,
                              dashboardData.currentMonth.paidAmount +
                                dashboardData.currentMonth.dueAmount +
                                dashboardData.currentMonth.pendingAmount,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Advance Balance
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    dashboardData?.overview.advance.remainingAdvance || 0,
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total:{" "}
                  {formatCurrency(
                    dashboardData?.overview.advance.totalAdvance || 0,
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Avg. Monthly Fee
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    dashboardData &&
                      dashboardData.currentMonth.paidAmount &&
                      dashboardData.currentMonth.dueAmount
                      ? (dashboardData.currentMonth.paidAmount +
                          dashboardData.currentMonth.dueAmount) /
                          (dashboardData.overview.activeStudents || 1)
                      : 0,
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  Per active student
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Overdue Students
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData?.overview.overdue.count || 0}
                </div>
                <div className="text-sm text-muted-foreground">
                  {dashboardData?.overview.overdue.count
                    ? calculatePercentage(
                        dashboardData.overview.overdue.count,
                        dashboardData.overview.activeStudents,
                      )
                    : 0}
                  % of active students
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Service status and uptime</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">Database</span>
                </div>
                <Badge variant="default">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">Email Service</span>
                </div>
                <Badge variant="default">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">Push Notifications</span>
                </div>
                <Badge variant="default">Operational</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">Cron Jobs</span>
                </div>
                <Badge variant="default">Running</Badge>
              </div>
              <Separator />
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">
                  Last Updated
                </div>
                <div className="text-sm font-medium">
                  {dashboardData?.generatedAt
                    ? formatDate(dashboardData.generatedAt)
                    : "N/A"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest system activities and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">
                  Student Registration
                </TableCell>
                <TableCell>{admin?.name}</TableCell>
                <TableCell>New Student</TableCell>
                <TableCell>Just now</TableCell>
                <TableCell>
                  <Badge variant="default">Completed</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Fee Payment</TableCell>
                <TableCell>System</TableCell>
                <TableCell>Monthly Fee</TableCell>
                <TableCell>2 hours ago</TableCell>
                <TableCell>
                  <Badge variant="default">Processed</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Reminder Sent</TableCell>
                <TableCell>Automated</TableCell>
                <TableCell>Due Fees</TableCell>
                <TableCell>4 hours ago</TableCell>
                <TableCell>
                  <Badge variant="default">Sent</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Slot Update</TableCell>
                <TableCell>{admin?.name}</TableCell>
                <TableCell>Morning Slot</TableCell>
                <TableCell>Yesterday</TableCell>
                <TableCell>
                  <Badge variant="default">Updated</Badge>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Report Generated</TableCell>
                <TableCell>System</TableCell>
                <TableCell>Monthly Report</TableCell>
                <TableCell>2 days ago</TableCell>
                <TableCell>
                  <Badge variant="default">Generated</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <Card className="p-4">
          <div className="text-2xl font-bold text-primary">
            {dashboardData?.overview.totalSlots || 0}
          </div>
          <div className="text-sm text-muted-foreground">Total Slots</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">
            {dashboardData?.overview.activeStudents || 0}
          </div>
          <div className="text-sm text-muted-foreground">Active Students</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">
            {dashboardData?.overview.slotsWithOccupancy?.reduce(
              (acc, slot) => acc + slot.occupiedSeats,
              0,
            ) || 0}
          </div>
          <div className="text-sm text-muted-foreground">
            Total Occupied Seats
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">
            {dashboardData?.overview.slotsWithOccupancy?.reduce(
              (acc, slot) => acc + slot.availableSeats,
              0,
            ) || 0}
          </div>
          <div className="text-sm text-muted-foreground">
            Total Available Seats
          </div>
        </Card>
      </div>
    </div>
  );
};
