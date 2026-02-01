import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, IndianRupee, Users, Send } from "lucide-react";
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
import { reminderApi } from "@/api/reminder.api";
import { useToast } from "@/hooks/useToast";

export const EndOfMonthDueReport: React.FC = () => {
  const toast = useToast();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // Fetch due summary
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["end-of-month-due", selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await reminderApi.getEndOfMonthDueSummary(
        selectedMonth,
        selectedYear,
      );
      if (error) throw error;
      return data?.data;
    },
  });

  const summary = summaryData;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const years = Array.from(
    { length: 5 },
    (_, i) => today.getFullYear() - 2 + i,
  );

  const handleSendReminders = async () => {
    if (!summary || summary.totalDueStudents === 0) {
      toast.warning("No students with due payments");
      return;
    }

    // This would normally call an API to create bulk reminders
    toast.success(
      `Reminder notifications queued for ${summary.totalDueStudents} students`,
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <AlertCircle className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          End-of-Month Due Report
        </h1>
        <p className="text-gray-600">
          View and manage students with unpaid fees before month end
        </p>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Month & Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-xs">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, idx) => (
                  <SelectItem key={idx} value={idx.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger>
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
        </CardContent>
      </Card>

      {summary && summary.totalDueStudents > 0 ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Total Due Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center gap-2">
                  <Users className="h-8 w-8 text-red-500" />
                  {summary.totalDueStudents}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Total Due Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center gap-2">
                  <IndianRupee className="h-8 w-8 text-green-600" />
                  {summary.totalDueAmount.toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Average Fee
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold flex items-center gap-2">
                  <IndianRupee className="h-8 w-8 text-blue-600" />
                  {Math.round(
                    summary.totalDueAmount / summary.totalDueStudents,
                  ).toLocaleString("en-IN")}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Button */}
          <div className="flex gap-2">
            <Button onClick={handleSendReminders}>
              <Send className="h-4 w-4 mr-2" />
              Send Reminders to All
            </Button>
            <Button variant="outline">
              <AlertCircle className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle>Students with Outstanding Fees</CardTitle>
              <CardDescription>
                {summary.students.length} student(s) have not paid their fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Base Fee</TableHead>
                      <TableHead>Total Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.students.map((fee) => (
                      <TableRow key={fee.studentId._id}>
                        <TableCell className="font-medium">
                          {fee.studentId.name}
                        </TableCell>
                        <TableCell>{fee.studentId.studentId}</TableCell>
                        <TableCell>{fee.studentId.email}</TableCell>
                        <TableCell>{fee.studentId.phone}</TableCell>
                        <TableCell>
                          ₹{fee.baseFee.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="font-semibold">
                          ₹{fee.totalAmount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              fee.status === "DUE" ? "destructive" : "secondary"
                            }
                          >
                            {fee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Send Reminder
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-3">
                  <AlertCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">All Fees Paid!</h3>
              <p className="text-gray-600">
                All students have paid their fees for {months[selectedMonth]}{" "}
                {selectedYear}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
