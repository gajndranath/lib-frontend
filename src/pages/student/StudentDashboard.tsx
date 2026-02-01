import { useQuery } from "@tanstack/react-query";
import {
  IndianRupee,
  Calendar,
  TrendingUp,
  AlertCircle,
  Receipt,
  Clock,
} from "lucide-react";
import { studentAuthApi } from "@/api/studentAuth.api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardData, DueItem, Payment } from "@/types/student.types";

export const StudentDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard"],
    queryFn: studentAuthApi.getDashboard,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const dashboardData = data?.data as DashboardData | undefined;

  const student = dashboardData?.student;
  const feeSummary = dashboardData?.feeSummary;
  const recentPayments = dashboardData?.recentPayments || [];
  const dueItems = dashboardData?.dueItems || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome, {student?.name}!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your library account
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(feeSummary?.totals?.totalPaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">All-time payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(feeSummary?.totals?.totalDue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dueItems.length} month(s) overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Fee</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(student?.monthlyFee || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Advance Balance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(feeSummary?.advance?.remainingAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>
      </div>

      {dueItems.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Overdue Payments
            </CardTitle>
            <CardDescription>
              Please clear your dues at the earliest
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dueItems.map((item: DueItem) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.monthYear}</p>
                    <p className="text-sm text-muted-foreground">
                      Amount: {formatCurrency(item.totalAmount || item.amount)}
                    </p>
                  </div>
                  <Badge variant="destructive">Overdue</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Payments
          </CardTitle>
          <CardDescription>Your last 6 payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No payment history yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment: Payment) => (
                <div
                  key={payment._id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{payment.monthYear}</p>
                      <p className="text-sm text-muted-foreground">
                        Paid on {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(payment.totalAmount || payment.amount)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {payment.paymentMethod}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
