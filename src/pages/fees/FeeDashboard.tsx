import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Users,
  CreditCard,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Calendar,
  FileText,
  Search,
  X,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { feeApi } from "@/api/fee.api";
import { studentApi } from "@/api/students.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import {
  formatCurrency,
  formatDate,
  getMonthName,
  calculatePercentage,
} from "@/lib/utils";
import type { FeeStatus } from "@/types";
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
import {
  useMonthlyTrendData,
  useSlotCollectionData,
  usePerformanceMetrics,
} from "./hooks/useFeeData";

const ITEMS_PER_PAGE = 10;

// Define mock slot data interface since slotApi is not imported
interface Slot {
  _id: string;
  name: string;
  monthlyFee: number;
  occupiedSeats: number;
}

// Define interface for fee detail
interface FeeDetail {
  studentId: string;
  studentName: string;
  studentStatus: string;
  month: number;
  year: number;
  baseFee: number;
  dueCarriedForward: number;
  totalAmount: number;
  status: FeeStatus;
  coveredByAdvance: boolean;
  locked: boolean;
  paymentDate?: Date;
}

// Define interface for payment stats
interface PaymentStats {
  total: number;
  paid: number;
  due: number;
  pending: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  pendingAmount: number;
}

export const FeeDashboard: React.FC = () => {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeeStatus | "ALL">("ALL");
  const [monthFilter, setMonthFilter] = useState<number>(new Date().getMonth());
  const [yearFilter, setYearFilter] = useState<number>(
    new Date().getFullYear(),
  );
  const [slotFilter, setSlotFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch fee status
  const {
    data: paymentData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["payment-status", monthFilter, yearFilter],
    queryFn: async () => {
      const { data, error } = await feeApi.getDashboardPaymentStatus(
        monthFilter,
        yearFilter,
      );
      if (error) throw error;
      return data?.data as {
        stats: PaymentStats;
        details: FeeDetail[];
      };
    },
  });

  // Fetch students for filters
  const { data: studentsData } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await studentApi.searchStudents({ limit: 1000 });
      if (error) throw error;
      return data?.data;
    },
  });

  // Mock slots data since slotApi is not defined in the original code
  const slotsData: Slot[] = useMemo(
    () => [
      { _id: "1", name: "Morning Slot", monthlyFee: 5000, occupiedSeats: 20 },
      { _id: "2", name: "Evening Slot", monthlyFee: 6000, occupiedSeats: 15 },
      { _id: "3", name: "Weekend Slot", monthlyFee: 7000, occupiedSeats: 10 },
    ],
    [],
  );

  // Handlers
  const handleRefresh = () => {
    refetch();
    toast.success("Fee data refreshed");
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setSlotFilter("ALL");
    setCurrentPage(1);
  };

  // Filter fee details
  const filteredDetails = useMemo(() => {
    if (!paymentData?.details) return [];

    return paymentData.details.filter((fee) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!fee.studentName.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL" && fee.status !== statusFilter) {
        return false;
      }

      // Slot filter
      if (slotFilter !== "ALL") {
        const student = studentsData?.students?.find(
          (s) => s._id === fee.studentId,
        );
        if (!student || student.slotId !== slotFilter) {
          return false;
        }
      }

      return true;
    });
  }, [paymentData, searchQuery, statusFilter, slotFilter, studentsData]);

  // Pagination
  const totalPages = Math.ceil(filteredDetails.length / ITEMS_PER_PAGE);
  const paginatedDetails = filteredDetails.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Chart data and computed values
  const paymentStatusData = paymentData?.stats
    ? [
        { name: "Paid", value: paymentData.stats.paid, color: "#10b981" },
        { name: "Pending", value: paymentData.stats.pending, color: "#f59e0b" },
        { name: "Due", value: paymentData.stats.due, color: "#ef4444" },
      ]
    : [];

  const monthlyTrendData = useMonthlyTrendData();
  const slotCollectionData = useSlotCollectionData(slotsData);
  const performanceMetrics = usePerformanceMetrics(
    slotCollectionData,
    paymentData,
  );

  const hasFilters =
    searchQuery || statusFilter !== "ALL" || slotFilter !== "ALL";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Fee Management
            </h1>
            <p className="text-muted-foreground">Loading fee data...</p>
          </div>
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
          <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground">
            Track and manage fee payments for {getMonthName(monthFilter)}{" "}
            {yearFilter}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {hasPermission("SUPER_ADMIN") && (
            <Button onClick={() => navigate("/fees/mark-payment")}>
              <span className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Mark Payment</span>
                <span className="sm:hidden">Pay</span>
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Viewing:</span>
              <span className="text-lg font-bold">
                {getMonthName(monthFilter)} {yearFilter}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={monthFilter.toString()}
                onValueChange={(v) => setMonthFilter(parseInt(v))}
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
                value={yearFilter.toString()}
                onValueChange={(v) => setYearFilter(parseInt(v))}
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
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expected
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(paymentData?.stats?.totalAmount || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Users className="mr-1 h-3 w-3" />
              <span>From {paymentData?.stats?.total || 0} students</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Collected
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(paymentData?.stats?.paidAmount || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              <span className="text-green-500">
                {paymentData?.stats?.total && paymentData.stats.total > 0
                  ? calculatePercentage(
                      paymentData.stats.paid,
                      paymentData.stats.total,
                    )
                  : 0}
                % collection rate
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Amount
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(paymentData?.stats?.pendingAmount || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span>From {paymentData?.stats?.pending || 0} students</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overdue Amount
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(paymentData?.stats?.dueAmount || 0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              <span className="text-red-500">
                {paymentData?.stats?.due || 0} overdue students
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Payment Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of fee collection status
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
                          paymentData?.stats?.total || 1,
                        )}
                        % of total
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Collection Trend</CardTitle>
                <CardDescription>
                  Payment collection over last 6 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
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
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="paid"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Paid Students"
                      />
                      <Line
                        type="monotone"
                        dataKey="due"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Overdue Students"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Statistics</CardTitle>
              <CardDescription>
                Key metrics and performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Collection Rate
                  </div>
                  <div className="text-2xl font-bold">
                    {paymentData?.stats?.totalAmount &&
                    paymentData?.stats?.paidAmount
                      ? calculatePercentage(
                          paymentData.stats.paidAmount,
                          paymentData.stats.totalAmount,
                        )
                      : 0}
                    %
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${
                          paymentData?.stats?.totalAmount &&
                          paymentData?.stats?.paidAmount
                            ? calculatePercentage(
                                paymentData.stats.paidAmount,
                                paymentData.stats.totalAmount,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Avg. Fee per Student
                  </div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(
                      paymentData?.stats?.total && paymentData.stats.total > 0
                        ? (paymentData.stats.totalAmount || 0) /
                            paymentData.stats.total
                        : 0,
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">Per month</div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Overdue Rate
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {paymentData?.stats?.total && paymentData.stats.total > 0
                      ? calculatePercentage(
                          paymentData.stats.due,
                          paymentData.stats.total,
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {paymentData?.stats?.due || 0} students
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Pending Rate
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {paymentData?.stats?.total && paymentData.stats.total > 0
                      ? calculatePercentage(
                          paymentData.stats.pending,
                          paymentData.stats.total,
                        )
                      : 0}
                    %
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {paymentData?.stats?.pending || 0} students
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filters</CardTitle>
              <CardDescription>
                Filter fee records by student, status, or slot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student name..."
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

                {/* Status Filter */}
                <div className="w-full sm:w-auto">
                  <Select
                    value={statusFilter}
                    onValueChange={(value: FeeStatus | "ALL") =>
                      setStatusFilter(value)
                    }
                  >
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="DUE">Due</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Slot Filter */}
                <div className="w-full sm:w-auto">
                  <Select
                    value={slotFilter}
                    onValueChange={(value) => setSlotFilter(value)}
                  >
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Slots</SelectItem>
                      {slotsData?.map((slot) => (
                        <SelectItem key={slot._id} value={slot._id}>
                          {slot.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filters */}
                {hasFilters && (
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="w-full sm:w-auto"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fee Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Fee Records</CardTitle>
              <CardDescription>
                Showing {paginatedDetails.length} of {filteredDetails.length}{" "}
                records
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paginatedDetails.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">
                    No fee records found
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {hasFilters
                      ? "Try adjusting your filters to see more results"
                      : "No fee records available for the selected period"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden space-y-4">
                    {paginatedDetails.map((fee) => (
                      <Card key={`${fee.studentId}-${fee.month}-${fee.year}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold">
                                {fee.studentName}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {getMonthName(fee.month)} {fee.year}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onSelect={() =>
                                    navigate(`/students/${fee.studentId}`)
                                  }
                                >
                                  <span className="flex items-center">
                                    <Users className="h-4 w-4 mr-2" />
                                    View Student
                                  </span>
                                </DropdownMenuItem>
                                {hasPermission("SUPER_ADMIN") && (
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      navigate(
                                        `/fees/mark-payment?studentId=${fee.studentId}&month=${fee.month}&year=${fee.year}`,
                                      )
                                    }
                                  >
                                    <span className="flex items-center">
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      Mark Payment
                                    </span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Status
                              </span>
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
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Amount
                              </span>
                              <span className="font-medium">
                                {formatCurrency(fee.totalAmount)}
                              </span>
                            </div>

                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                Base Fee
                              </span>
                              <span>{formatCurrency(fee.baseFee)}</span>
                            </div>

                            {(fee.dueCarriedForward || 0) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Previous Due
                                </span>
                                <span className="text-red-600">
                                  {formatCurrency(fee.dueCarriedForward || 0)}
                                </span>
                              </div>
                            )}

                            {fee.coveredByAdvance && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Advance Applied
                                </span>
                                <span className="text-green-600">Yes</span>
                              </div>
                            )}

                            {fee.paymentDate && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Paid On
                                </span>
                                <span>{formatDate(fee.paymentDate)}</span>
                              </div>
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
                          <TableHead>Base Fee</TableHead>
                          <TableHead>Previous Due</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDetails.map((fee) => (
                          <TableRow
                            key={`${fee.studentId}-${fee.month}-${fee.year}`}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="font-medium text-primary">
                                    {fee.studentName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div>{fee.studentName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {fee.studentStatus}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getMonthName(fee.month)} {fee.year}
                            </TableCell>
                            <TableCell>{formatCurrency(fee.baseFee)}</TableCell>
                            <TableCell>
                              {(fee.dueCarriedForward || 0) > 0 ? (
                                <span className="text-red-600">
                                  {formatCurrency(fee.dueCarriedForward || 0)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-bold">
                              {formatCurrency(fee.totalAmount)}
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
                              {fee.coveredByAdvance && (
                                <div className="text-xs text-green-600 mt-1">
                                  Advance Applied
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {fee.paymentDate
                                ? formatDate(fee.paymentDate)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      navigate(`/students/${fee.studentId}`)
                                    }
                                  >
                                    <span className="flex items-center">
                                      <Users className="h-4 w-4 mr-2" />
                                      View Student
                                    </span>
                                  </DropdownMenuItem>
                                  {hasPermission("SUPER_ADMIN") && (
                                    <DropdownMenuItem
                                      onSelect={() =>
                                        navigate(
                                          `/fees/mark-payment?studentId=${fee.studentId}&month=${fee.month}&year=${fee.year}`,
                                        )
                                      }
                                    >
                                      <span className="flex items-center">
                                        <CreditCard className="h-4 w-4 mr-2" />
                                        Mark Payment
                                      </span>
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

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(3, totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage === 1) {
                                pageNum = i + 1;
                              } else if (currentPage === totalPages) {
                                pageNum = totalPages - 2 + i;
                              } else {
                                pageNum = currentPage - 1 + i;
                              }

                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    currentPage === pageNum
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="h-8 w-8 p-0"
                                >
                                  {pageNum}
                                </Button>
                              );
                            },
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Slot-wise Collection */}
          <Card>
            <CardHeader>
              <CardTitle>Slot-wise Collection</CardTitle>
              <CardDescription>
                Fee collection performance by slot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={slotCollectionData}>
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
                    />
                    <Legend />
                    <Bar
                      dataKey="expected"
                      name="Expected Revenue"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="collected"
                      name="Collected Revenue"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Collection Insights */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key performance indicators and insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics.map((metric, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium">{metric.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {metric.description}
                        </div>
                      </div>
                      <div
                        className={`text-right font-semibold ${
                          metric.trend === "positive"
                            ? "text-green-600"
                            : metric.trend === "negative"
                              ? "text-red-600"
                              : ""
                        }`}
                      >
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Collection Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle>Collection Efficiency</CardTitle>
                <CardDescription>Collection rate by slot</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {slotCollectionData.map((slot, index) => {
                    const rate =
                      slot.expected > 0
                        ? Math.round((slot.collected / slot.expected) * 100)
                        : 0;

                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {slot.name}
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              rate >= 80
                                ? "text-green-600"
                                : rate >= 60
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {rate}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              rate >= 80
                                ? "bg-green-500"
                                : rate >= 60
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(rate, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>₹{slot.collected.toLocaleString("en-IN")}</span>
                          <span>₹{slot.expected.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common fee management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {hasPermission("SUPER_ADMIN") && (
              <>
                <Button
                  variant="outline"
                  className="h-auto py-4"
                  onClick={() => navigate("/fees/mark-payment")}
                >
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">Mark Payment</div>
                      <div className="text-xs text-muted-foreground">
                        Record payment
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4"
                  onClick={() => navigate("/fees/advance")}
                >
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">Add Advance</div>
                      <div className="text-xs text-muted-foreground">
                        Add advance payment
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4"
                  onClick={() => navigate("/fees/due")}
                >
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">Due Tracking</div>
                      <div className="text-xs text-muted-foreground">
                        Track overdue payments
                      </div>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4"
                  onClick={() => navigate("/fees/receipts")}
                >
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <div className="font-medium">Receipts</div>
                      <div className="text-xs text-muted-foreground">
                        Generate receipts
                      </div>
                    </div>
                  </div>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
