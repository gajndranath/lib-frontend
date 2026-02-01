import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm, type Resolver, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CreditCard,
  ArrowLeft,
  User,
  DollarSign,
  Clock,
  Receipt,
  CheckCircle,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { feeApi } from "@/api/fee.api";
import { studentApi } from "@/api/students.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, getMonthName, formatDate } from "@/lib/utils";
import type { Student } from "@/types";

// Validation schema
const paymentSchema = z.object({
  method: z.enum(["CASH", "ONLINE", "CHEQUE", "OTHER"]),
  amount: z.coerce.number().positive("Amount must be positive"),
  transactionId: z.string().optional(),
  remarks: z.string().max(500).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export const MarkPayment: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  // State
  const [studentId, setStudentId] = useState(
    searchParams.get("studentId") || "",
  );
  const [month, setMonth] = useState(
    searchParams.get("month")
      ? parseInt(searchParams.get("month")!)
      : new Date().getMonth(),
  );
  const [year, setYear] = useState(
    searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : new Date().getFullYear(),
  );
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPage, setStudentPage] = useState(1);

  // Check permission
  useEffect(() => {
    if (!hasPermission("SUPER_ADMIN")) {
      toast.error("You do not have permission to mark payments");
      navigate("/fees");
    }
  }, [hasPermission, navigate, toast]);

  // Sync state with URL params
  // (Removed: do not set state from searchParams in an effect)

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (studentId) {
      params.set("studentId", studentId);
    } else {
      params.delete("studentId");
    }
    params.set("month", month.toString());
    params.set("year", year.toString());
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [studentId, month, year, searchParams, setSearchParams]);

  // Fetch student fee summary
  const { data: feeSummary, isLoading: isLoadingFee } = useQuery({
    queryKey: ["fee-summary", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await feeApi.getFeeSummary(studentId);
      if (error) throw error;
      return data?.data;
    },
    enabled: !!studentId,
  });

  // Fetch student details
  const { data: studentData, isLoading: isLoadingStudent } = useQuery({
    queryKey: ["student", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data, error } = await studentApi.getStudentDetails(studentId);
      if (error) throw error;
      return data?.data;
    },
    enabled: !!studentId,
  });

  const selectedStudent: Student | null =
    studentData && typeof studentData === "object" && "student" in studentData
      ? (studentData as { student: Student }).student
      : (studentData as Student | null);

  // Fetch students for selection dialog
  const { data: studentsSearchData, isLoading: isLoadingStudentsSearch } =
    useQuery({
      queryKey: ["students-search", studentSearch, studentPage],
      queryFn: async () => {
        const { data, error } = await studentApi.searchStudents({
          query: studentSearch || undefined,
          status: "ACTIVE",
          page: studentPage,
          limit: 10,
        });
        if (error) throw error;
        return data?.data;
      },
    });

  // Fetch specific monthly fee
  const { data: monthlyFee, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ["monthly-fee", studentId, month, year],
    queryFn: async () => {
      if (!studentId) return null;
      // In a real app, you'd fetch the specific monthly fee
      // For now, we'll get it from the fee summary
      return feeSummary?.feeHistory?.find(
        (fee) => fee.month === month && fee.year === year,
      );
    },
    enabled: !!feeSummary,
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema) as Resolver<PaymentFormData>,
    defaultValues: {
      method: "CASH",
      amount: 0,
      transactionId: "",
      remarks: "",
    },
  });

  const dueAmount = useWatch({
    control: form.control,
    name: "amount",
    defaultValue: 0,
  });

  // Set default amount when monthly fee is loaded
  React.useLayoutEffect(() => {
    if (monthlyFee && form.getValues("amount") === 0) {
      form.setValue("amount", monthlyFee.totalAmount);
    }
  }, [monthlyFee, form]);

  // Reset form when student changes
  useEffect(() => {
    form.reset({
      method: "CASH",
      amount: 0,
      transactionId: "",
      remarks: "",
    });
  }, [studentId, form]);

  const handleSelectStudent = (student: Student) => {
    setStudentId(student._id);
    setStudentSearch("");
    setStudentPage(1);
    setIsStudentDialogOpen(false);
    toast.success(`Selected ${student.name}`);
  };

  // Mutation for marking as paid
  const markAsPaidMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!studentId) throw new Error("Student ID is required");
      return feeApi.markFeeAsPaid(studentId, month, year, data);
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      navigate("/fees");
    },
    onError: (error: Error) => {
      toast.error(`Payment failed: ${error.message}`);
    },
  });

  // Handle form submission
  const onSubmit = (data: PaymentFormData) => {
    if (!studentId) {
      toast.error("Please select a student");
      return;
    }

    if (data.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (monthlyFee?.status === "PAID") {
      toast.error("This month is already paid");
      return;
    }

    if (monthlyFee?.locked) {
      toast.error("This month is locked and cannot be modified");
      return;
    }

    markAsPaidMutation.mutate(data);
  };

  // Handle mark as due
  const handleMarkAsDue = async () => {
    if (!studentId) {
      toast.error("Please select a student");
      return;
    }

    try {
      await feeApi.markFeeAsDue(studentId, month, year, new Date());
      toast.success("Fee marked as due");
      navigate("/fees");
    } catch (error) {
      toast.error(
        `Failed to mark as due: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  // Handle advance payment
  const handleAdvancePayment = async () => {
    if (!studentId) {
      toast.error("Please select a student");
      return;
    }

    const amount = form.getValues("amount");
    if (amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      await feeApi.addAdvance(studentId, amount);
      toast.success("Advance added successfully");
      navigate("/fees");
    } catch (error) {
      toast.error(
        `Failed to add advance: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  };

  const capitalizeSafe = (value?: string | null) => {
    if (!value) return "—";
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const getInitialSafe = (value?: string | null) => {
    if (!value) return "—";
    return value.charAt(0).toUpperCase();
  };

  if (isLoadingStudent || isLoadingFee || isLoadingMonthly) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/fees")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mark Payment</h1>
            <p className="text-muted-foreground">Loading payment details...</p>
          </div>
        </div>

        {/* Skeleton loader */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/fees")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mark Payment</h1>
          <p className="text-muted-foreground">
            Record fee payment for student
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Student Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Student Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Student Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedStudent ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {getInitialSafe(selectedStudent.name)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold">{selectedStudent.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedStudent.phone}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Monthly Fee
                      </span>
                      <span className="font-medium">
                        {formatCurrency(selectedStudent.monthlyFee)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Status
                      </span>
                      <Badge variant="secondary">
                        {capitalizeSafe(selectedStudent.status)}
                      </Badge>
                    </div>
                    {selectedStudent.slotId &&
                      typeof selectedStudent.slotId !== "string" && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Slot
                          </span>
                          <span>{selectedStudent.slotId.name}</span>
                        </div>
                      )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <User className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No student selected</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/students")}
                    >
                      Browse Students
                    </Button>
                    <Button onClick={() => setIsStudentDialogOpen(true)}>
                      Select Student
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fee Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Fee Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {feeSummary ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Paid
                      </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(feeSummary.totals.totalPaid)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Due
                      </span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(feeSummary.totals.totalDue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Pending
                      </span>
                      <span className="font-medium text-yellow-600">
                        {formatCurrency(feeSummary.totals.totalPending)}
                      </span>
                    </div>
                  </div>

                  {feeSummary.advance && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Advance Balance
                          </span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(feeSummary.advance.remainingAmount)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {feeSummary.advance.monthsCovered.length} months
                          covered
                        </div>
                      </div>
                    </>
                  )}

                  {feeSummary.due && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            Overdue Amount
                          </span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(feeSummary.due.totalDueAmount)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Next reminder:{" "}
                          {formatDate(feeSummary.due.reminderDate)}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">No fee data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Record payment for {getMonthName(month)} {year}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Month/Year Selector */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    <CalendarIcon className="h-4 w-4 inline mr-1" />
                    Month
                  </label>
                  <Select
                    value={month.toString()}
                    onValueChange={(v) => setMonth(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
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
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Select
                    value={year.toString()}
                    onValueChange={(v) => setYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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

              {/* Monthly Fee Status */}
              {monthlyFee && (
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {getMonthName(month)} {year} Fee
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Base: {formatCurrency(monthlyFee.baseFee)} + Previous
                          Due: {formatCurrency(monthlyFee.dueCarriedForward)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatCurrency(monthlyFee.totalAmount)}
                        </div>
                        <Badge variant="secondary" className="mt-1">
                          {monthlyFee.status}
                        </Badge>
                      </div>
                    </div>

                    {monthlyFee.locked && (
                      <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            This month is locked
                          </span>
                        </div>
                        <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">
                          Locked months cannot be modified. Contact system
                          administrator if changes are required.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Payment Type Tabs */}
              <Tabs defaultValue="regular" className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="regular">Regular Payment</TabsTrigger>
                  <TabsTrigger value="advance">Advance Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="regular" className="space-y-4">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-6"
                    >
                      <FormField
                        control={form.control}
                        name="method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white">
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="ONLINE">Online</SelectItem>
                                <SelectItem value="CHEQUE">Cheque</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Select how the payment was made
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              {dueAmount > 0 && (
                                <span>
                                  Total due:{" "}
                                  <strong>{formatCurrency(dueAmount)}</strong>
                                </span>
                              )}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="transactionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transaction ID (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormDescription>
                              Reference number for online payments
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Remarks (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Add any additional notes about this payment"
                                rows={3}
                              />
                            </FormControl>
                            <FormDescription>
                              Maximum 500 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-4">
                        <Button
                          type="submit"
                          disabled={
                            markAsPaidMutation.isPending ||
                            !studentId ||
                            monthlyFee?.status === "PAID"
                          }
                          className="flex-1"
                        >
                          {markAsPaidMutation.isPending ? (
                            <>
                              <Clock className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Record Payment
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleMarkAsDue}
                          disabled={!studentId || monthlyFee?.status === "DUE"}
                        >
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Mark as Due
                        </Button>
                      </div>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="advance" className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-400 mb-2">
                      <Receipt className="h-4 w-4" />
                      <span className="font-medium">
                        Advance Payment Information
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-500">
                      Advance payments will be added to the student's advance
                      balance and can be applied to future months automatically
                      or manually.
                    </p>
                  </div>

                  <Form {...form}>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Advance Amount (₹)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="remarks"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Remarks</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Reason for advance payment"
                                rows={3}
                              />
                            </FormControl>
                            <FormDescription>
                              Explain why this advance is being added
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        onClick={handleAdvancePayment}
                        disabled={!studentId}
                        className="w-full"
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Add Advance Payment
                      </Button>
                    </div>
                  </Form>
                </TabsContent>
              </Tabs>

              {/* Student Selection */}
              {!studentId && (
                <Card className="mt-6">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <h3 className="font-semibold mb-2">
                        No Student Selected
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Please select a student to record payment
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => navigate("/students")}
                        >
                          Browse Students
                        </Button>
                        <Button onClick={() => setIsStudentDialogOpen(true)}>
                          Select Student
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Selection Dialog */}
      <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Select Student</DialogTitle>
            <DialogDescription>
              Search and select a student to record payment
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setStudentPage(1);
              }}
              placeholder="Search by name, phone, or email"
            />

            <div className="max-h-72 overflow-y-auto border rounded-md">
              {isLoadingStudentsSearch ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Loading students...
                </div>
              ) : studentsSearchData?.students?.length ? (
                <div className="divide-y">
                  {studentsSearchData.students.map((student) => (
                    <button
                      key={student._id}
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="w-full text-left p-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.phone}
                            {student.email ? ` • ${student.email}` : ""}
                          </div>
                        </div>
                        <Badge variant="secondary">{student.status}</Badge>
                      </div>
                      {student.slotId && typeof student.slotId !== "string" && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Slot: {student.slotId.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">
                  No students found
                </div>
              )}
            </div>

            {studentsSearchData?.pagination && (
              <div className="flex items-center justify-between text-sm">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                  disabled={studentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {studentsSearchData.pagination.page} of{" "}
                  {studentsSearchData.pagination.pages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setStudentPage((p) =>
                      Math.min(studentsSearchData.pagination.pages, p + 1),
                    )
                  }
                  disabled={studentPage >= studentsSearchData.pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
