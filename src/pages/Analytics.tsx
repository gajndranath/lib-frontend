import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
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
import {
  Users,
  TrendingUp,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Download,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi } from "@/api/admin.api";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, getMonthName } from "@/lib/utils";

const COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6"];

export const Analytics: React.FC = () => {
  const toast = useToast();
  const [startMonth, setStartMonth] = useState(new Date().getMonth() - 2);
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth());
  const [endYear, setEndYear] = useState(new Date().getFullYear());

  // Fetch dashboard stats
  const {
    data: dashboardStats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await adminApi.getDashboardStats();
      if (error) throw error;
      return data?.data;
    },
  });

  // Fetch financial report
  const {
    data: financialReport,
    isLoading: isLoadingReport,
    refetch: refetchReport,
  } = useQuery({
    queryKey: ["financial-report", startMonth, startYear, endMonth, endYear],
    queryFn: async () => {
      const { data, error } = await adminApi.getFinancialReport({
        startMonth,
        startYear,
        endMonth,
        endYear,
      });
      if (error) throw error;
      return data?.data;
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchReport();
    toast.success("Analytics refreshed");
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  const isLoading = isLoadingStats || isLoadingReport;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled>
              <RefreshCw className="h-4 w-4 animate-spin" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const monthlyTrend = financialReport?.report || [];
  const summary = financialReport?.summary || {
    totalCollected: 0,
    totalPending: 0,
    collectionRate: 0,
  };
  const overview = dashboardStats?.overview || {
    totalStudents: 0,
    activeStudents: 0,
    advance: {
      remainingAdvance: 0,
      totalAdvance: 0,
    },
  };
  const currentMonth = dashboardStats?.currentMonth || {
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    paid: 0,
    due: 0,
    pending: 0,
    paidAmount: 0,
    dueAmount: 0,
    pendingAmount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Financial reports and business analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview.totalStudents || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview.activeStudents || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalCollected || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.collectionRate || 0}% collection rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalPending || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Pending collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Advance Balance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview.advance?.remainingAdvance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(overview.advance?.totalAdvance || 0)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Trend</CardTitle>
          <CardDescription>Last 6 months payment collection</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardStats?.monthlyTrend &&
          dashboardStats.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={dashboardStats.monthlyTrend}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="paidAmount"
                  stroke="#10b981"
                  name="Paid"
                />
                <Line
                  type="monotone"
                  dataKey="dueAmount"
                  stroke="#ef4444"
                  name="Due"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Month Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Month Status</CardTitle>
            <CardDescription>
              {getMonthName(currentMonth.month)} {currentMonth.year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentMonth.paid || currentMonth.due || currentMonth.pending ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Paid", value: currentMonth.paid || 0 },
                      { name: "Due", value: currentMonth.due || 0 },
                      { name: "Pending", value: currentMonth.pending || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
            <CardDescription>Current month statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Paid</span>
                <Badge variant="default" className="bg-green-600">
                  {currentMonth.paid || 0} (
                  {currentMonth.paidAmount
                    ? formatCurrency(currentMonth.paidAmount)
                    : "₹0"}
                  )
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Due</span>
                <Badge variant="destructive">
                  {currentMonth.due || 0} (
                  {currentMonth.dueAmount
                    ? formatCurrency(currentMonth.dueAmount)
                    : "₹0"}
                  )
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pending</span>
                <Badge variant="secondary">
                  {currentMonth.pending || 0} (
                  {currentMonth.pendingAmount
                    ? formatCurrency(currentMonth.pendingAmount)
                    : "₹0"}
                  )
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Period Filter</CardTitle>
          <CardDescription>
            Select date range for detailed report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Start Month
              </label>
              <Select
                value={startMonth.toString()}
                onValueChange={(v) => setStartMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {getMonthName(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Start Year
              </label>
              <Select
                value={startYear.toString()}
                onValueChange={(v) => setStartYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                End Month
              </label>
              <Select
                value={endMonth.toString()}
                onValueChange={(v) => setEndMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {getMonthName(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">End Year</label>
              <Select
                value={endYear.toString()}
                onValueChange={(v) => setEndYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Report Table */}
      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Report</CardTitle>
            <CardDescription>
              Financial summary from {getMonthName(startMonth)} {startYear} to{" "}
              {getMonthName(endMonth)} {endYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Total Students</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Collection %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyTrend.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {row.period}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.totalStudents}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.totals?.expected || 0)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(row.totals?.collected || 0)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(row.totals?.pending || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {row.totals?.collectionRate || 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
