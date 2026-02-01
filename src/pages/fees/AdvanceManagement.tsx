import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DollarSign,
  Plus,
  TrendingUp,
  Calendar,
  User,
  Search,
  RefreshCw,
  Download,
  MoreVertical,
  CreditCard,
  AlertCircle,
  CheckCircle,
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
import {
  Form,
  FormControl,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { studentApi } from "@/api/students.api";
import { feeApi } from "@/api/fee.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import type { AdvanceBalance } from "@/types";

// Validation schema for adding advance
const advanceSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  remarks: z.string().max(500).optional(),
});

type AdvanceFormData = z.infer<typeof advanceSchema>;

export const AdvanceManagement: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const toast = useToast();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceBalance | null>(
    null
  );

  // Check permission
  React.useEffect(() => {
    if (!hasPermission("SUPER_ADMIN")) {
      toast.error("You do not have permission to manage advance payments");
      navigate("/fees");
    }
  }, [hasPermission, navigate, toast]);

  // Fetch students with advance balances
  const {
    data: studentsData,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["students-with-advance"],
    queryFn: async () => {
      // FIXED: Removed sortBy parameter
      const { data, error } = await studentApi.searchStudents({
        limit: 1000,
      });
      if (error) throw error;

      // Filter students with advance balances or all if we want to see all
      const studentsWithDetails = await Promise.all(
        data?.data?.students?.map(async (student) => {
          try {
            const { data: feeSummary } = await feeApi.getFeeSummary(
              student._id
            );
            return {
              ...student,
              advanceBalance: feeSummary?.data
                ?.advance as AdvanceBalance | null,
              feeSummary: feeSummary?.data,
            };
          } catch {
            return { ...student, advanceBalance: null };
          }
        }) || []
      );

      return studentsWithDetails;
    },
  });

  // Filter students
  const filteredStudents = React.useMemo(() => {
    if (!studentsData) return [];

    return studentsData.filter((student) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !student.name.toLowerCase().includes(query) &&
          !student.phone.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Advance filter - show only those with advance or all
      const hasAdvance =
        student.advanceBalance && student.advanceBalance.remainingAmount > 0;
      return hasAdvance || searchQuery; // Show all if searching
    });
  }, [studentsData, searchQuery]);

  // FIXED: Form for adding advance with type assertion
  const addAdvanceForm = useForm<AdvanceFormData>({
    resolver: zodResolver(advanceSchema) as Resolver<AdvanceFormData>,
    defaultValues: {
      amount: 0,
      remarks: "",
    },
  });

  // Mutation for adding advance
  const addAdvanceMutation = useMutation({
    mutationFn: async ({
      studentId,
      amount,
    }: {
      studentId: string;
      amount: number;
    }) => {
      return feeApi.addAdvance(studentId, amount);
    },
    onSuccess: () => {
      toast.success("Advance added successfully");
      setIsAddDialogOpen(false);
      addAdvanceForm.reset();
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add advance: ${error.message}`);
    },
  });

  // FIXED: Handle add advance with proper form submission
  const handleAddAdvance = async (data: AdvanceFormData) => {
    if (!selectedStudent) {
      toast.error("Please select a student");
      return;
    }

    addAdvanceMutation.mutate({
      studentId: selectedStudent,
      amount: data.amount,
    });
  };

  // Handle apply advance
  const handleApplyAdvance = (_studentId: string) => {
    // In a real app, you would implement advance application logic
    toast.info("Advance application functionality coming soon");
    setIsApplyDialogOpen(false);
  };

  // Calculate totals
  const totals = React.useMemo(() => {
    if (!studentsData)
      return { totalAdvance: 0, utilizedAdvance: 0, remainingAdvance: 0 };

    return studentsData.reduce(
      (acc, student) => {
        if (student.advanceBalance) {
          acc.totalAdvance += student.advanceBalance.totalAmount;
          acc.remainingAdvance += student.advanceBalance.remainingAmount;
          acc.utilizedAdvance +=
            student.advanceBalance.totalAmount -
            student.advanceBalance.remainingAmount;
        }
        return acc;
      },
      { totalAdvance: 0, utilizedAdvance: 0, remainingAdvance: 0 }
    );
  }, [studentsData]);

  // Handle export
  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Advance Management
            </h1>
            <p className="text-muted-foreground">Loading advance data...</p>
          </div>
        </div>

        {/* Skeleton loader */}
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-3xl font-bold tracking-tight">
            Advance Management
          </h1>
          <p className="text-muted-foreground">
            Manage student advance payments and balances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Advance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Advance Payment</DialogTitle>
                <DialogDescription>
                  Add advance payment to student's account
                </DialogDescription>
              </DialogHeader>

              <Form {...addAdvanceForm}>
                <form
                  onSubmit={addAdvanceForm.handleSubmit(handleAddAdvance)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Select Student
                    </label>
                    <Select
                      onValueChange={setSelectedStudent}
                      value={selectedStudent || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {studentsData?.map((student) => (
                          <SelectItem key={student._id} value={student._id}>
                            {student.name} ({student.phone})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FormField
                    control={addAdvanceForm.control}
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
                            placeholder="Enter amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addAdvanceForm.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Reason for advance" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        addAdvanceMutation.isPending || !selectedStudent
                      }
                    >
                      {addAdvanceMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Advance
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Advance Balance
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.totalAdvance)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <TrendingUp className="mr-1 h-3 w-3" />
              <span>From {filteredStudents.length} students</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilized Advance
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.utilizedAdvance)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span>
                {totals.totalAdvance > 0
                  ? Math.round(
                      (totals.utilizedAdvance / totals.totalAdvance) * 100
                    )
                  : 0}
                % of total advance
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Advance
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(totals.remainingAdvance)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span>
                {
                  filteredStudents.filter(
                    (s) => (s.advanceBalance?.remainingAmount ?? 0) > 0
                  ).length
                }{" "}
                students with balance
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>Search and filter advance records</CardDescription>
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

            {/* Balance Filter */}
            <div className="w-full sm:w-auto">
              <Select>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Balance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Balances</SelectItem>
                  <SelectItem value="has-balance">Has Balance</SelectItem>
                  <SelectItem value="no-balance">No Balance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Advance Records</CardTitle>
          <CardDescription>
            Showing {filteredStudents.length} student advance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                No advance records found
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search to see more results"
                  : "No advance records available"}
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Advance
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {filteredStudents.map((student) => (
                  <Card key={student._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{student.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {student.phone}
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
                              onClick={() =>
                                navigate(`/students/${student._id}`)
                              }
                            >
                              <User className="h-4 w-4 mr-2" />
                              View Student
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(student._id);
                                setIsAddDialogOpen(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Advance
                            </DropdownMenuItem>
                            {(student.advanceBalance?.remainingAmount ?? 0) >
                              0 && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAdvance(student.advanceBalance!);
                                  setIsApplyDialogOpen(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Apply Advance
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <Separator className="my-3" />

                      {student.advanceBalance ? (
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <div className="text-sm text-muted-foreground">
                              Total Advance
                            </div>
                            <div className="font-medium">
                              {formatCurrency(
                                student.advanceBalance.totalAmount
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between">
                            <div className="text-sm text-muted-foreground">
                              Utilized
                            </div>
                            <div className="font-medium text-green-600">
                              {formatCurrency(
                                student.advanceBalance.totalAmount -
                                  student.advanceBalance.remainingAmount
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between">
                            <div className="text-sm text-muted-foreground">
                              Remaining Balance
                            </div>
                            <div className="font-bold text-blue-600">
                              {formatCurrency(
                                student.advanceBalance.remainingAmount
                              )}
                            </div>
                          </div>

                          {student.advanceBalance.monthsCovered.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {student.advanceBalance.monthsCovered.length}{" "}
                              months covered
                            </div>
                          )}

                          {student.advanceBalance.lastAppliedMonth && (
                            <div className="text-xs text-muted-foreground">
                              Last applied: Month{" "}
                              {student.advanceBalance.lastAppliedMonth.month +
                                1}
                              , {student.advanceBalance.lastAppliedMonth.year}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-sm text-muted-foreground">
                            No advance balance
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setSelectedStudent(student._id);
                              setIsAddDialogOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Advance
                          </Button>
                        </div>
                      )}
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
                      <TableHead>Phone</TableHead>
                      <TableHead>Total Advance</TableHead>
                      <TableHead>Utilized</TableHead>
                      <TableHead>Remaining Balance</TableHead>
                      <TableHead>Months Covered</TableHead>
                      <TableHead>Last Applied</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="font-medium text-primary">
                                {student.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div>{student.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {student.status}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>
                          {student.advanceBalance ? (
                            <span>
                              {formatCurrency(
                                student.advanceBalance.totalAmount
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.advanceBalance ? (
                            <span className="text-green-600">
                              {formatCurrency(
                                student.advanceBalance.totalAmount -
                                  student.advanceBalance.remainingAmount
                              )}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.advanceBalance ? (
                            <Badge
                              variant={
                                student.advanceBalance.remainingAmount > 0
                                  ? "default"
                                  : "secondary"
                              }
                              className="font-bold"
                            >
                              {formatCurrency(
                                student.advanceBalance.remainingAmount
                              )}
                            </Badge>
                          ) : (
                            <Badge variant="outline">No Balance</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.advanceBalance ? (
                            <span>
                              {student.advanceBalance.monthsCovered.length}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.advanceBalance?.lastAppliedMonth ? (
                            <span className="text-sm">
                              M
                              {student.advanceBalance.lastAppliedMonth.month +
                                1}{" "}
                              {student.advanceBalance.lastAppliedMonth.year}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
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
                                onClick={() =>
                                  navigate(`/students/${student._id}`)
                                }
                              >
                                <User className="h-4 w-4 mr-2" />
                                View Student
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedStudent(student._id);
                                  setIsAddDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Advance
                              </DropdownMenuItem>
                              {(student.advanceBalance?.remainingAmount ?? 0) >
                                0 && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (student.advanceBalance) {
                                      setSelectedAdvance(
                                        student.advanceBalance
                                      );
                                      setIsApplyDialogOpen(true);
                                    }
                                  }}
                                >
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Apply Advance
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

      {/* Apply Advance Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Advance Balance</DialogTitle>
            <DialogDescription>
              Apply student's advance balance to pending fees
            </DialogDescription>
          </DialogHeader>

          {selectedAdvance && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Total Advance
                      </span>
                      <span className="font-medium">
                        {formatCurrency(selectedAdvance.totalAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Utilized
                      </span>
                      <span className="text-green-600">
                        {formatCurrency(
                          selectedAdvance.totalAmount -
                            selectedAdvance.remainingAmount
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Available Balance
                      </span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(selectedAdvance.remainingAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Select Month to Apply
                </label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* In a real app, list pending months */}
                    <SelectItem value="current">Current Month</SelectItem>
                    <SelectItem value="previous">Previous Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Amount to Apply (₹)
                </label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  max={selectedAdvance.remainingAmount}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum available:{" "}
                  {formatCurrency(selectedAdvance.remainingAmount)}
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsApplyDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleApplyAdvance(selectedAdvance.studentId)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Apply Advance
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
