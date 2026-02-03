import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Archive,
  RefreshCw,
  Download,
  Users,
  UserCheck,
  UserX,
  CreditCard,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
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
  DropdownMenuSeparator,
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
import { studentApi } from "@/api/students.api";
import { slotApi } from "@/api/slot.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate, truncateText } from "@/lib/utils";
import type { Student, StudentStatus } from "@/types/index";

interface Slot {
  _id: string;
  name: string;
}

const ITEMS_PER_PAGE = 10;

export const StudentList: React.FC = () => {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("query") || "",
  );
  const [statusFilter, setStatusFilter] = useState<StudentStatus | "ALL">(
    (searchParams.get("status") as StudentStatus) || "ALL",
  );
  const [slotFilter, setSlotFilter] = useState(
    searchParams.get("slotId") || "ALL",
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1"),
  );
  const [archiveDialog, setArchiveDialog] = useState<{
    open: boolean;
    student: Student | null;
  }>({
    open: false,
    student: null,
  });

  // Fetch students
  // Fetch students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["students", searchQuery, statusFilter, slotFilter, currentPage],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {
        query: searchQuery || undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      };

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      if (slotFilter !== "ALL") {
        params.slotId = slotFilter;
      }

      const { data, error } = await studentApi.searchStudents(params);
      if (error) throw error;

      // ✅ Correct: Access data?.data?.students and data?.data?.pagination
      return {
        data: data?.data?.students || [], // Fix here
        pagination: data?.data?.pagination || {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          total: 0,
          pages: 0,
        },
      };
    },
  });
  // Fetch slots for filter
  const { data: slotsData } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const { data, error } = await slotApi.getAllSlots();
      if (error) throw error;
      return data?.data;
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: ({
      studentId,
      reason,
    }: {
      studentId: string;
      reason: string;
    }) => studentApi.archiveStudent(studentId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student archived successfully");
      setArchiveDialog({ open: false, student: null });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive student");
    },
  });

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("query", value);
    } else {
      params.delete("query");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  // Handle status filter
  const handleStatusFilter = (value: StudentStatus | "ALL") => {
    setStatusFilter(value);
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams);
    if (value !== "ALL") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  // Handle slot filter
  const handleSlotFilter = (value: string) => {
    setSlotFilter(value);
    setCurrentPage(1);

    const params = new URLSearchParams(searchParams);
    if (value !== "ALL") {
      params.set("slotId", value);
    } else {
      params.delete("slotId");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);

    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    setSearchParams(params);

    // Scroll to top on mobile
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handle archive
  const handleArchive = (student: Student) => {
    setArchiveDialog({ open: true, student });
  };

  // Status counts
  const statusCounts = useMemo(() => {
    if (!studentsData?.data || !Array.isArray(studentsData.data)) {
      return {
        total: 0,
        active: 0,
        inactive: 0,
        archived: 0,
      };
    }

    return {
      total: studentsData.pagination.total,
      active: studentsData.data.filter((s) => s.status === "ACTIVE").length,
      inactive: studentsData.data.filter((s) => s.status === "INACTIVE").length,
      archived: studentsData.data.filter((s) => s.status === "ARCHIVED").length,
    };
  }, [studentsData]);

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setSlotFilter("ALL");
    setCurrentPage(1);
    setSearchParams({});
  };

  const hasFilters =
    searchQuery || statusFilter !== "ALL" || slotFilter !== "ALL";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Students</h1>
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        </div>

        {/* Skeleton loader */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
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
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            Manage student registrations and information
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("SUPER_ADMIN") && (
            <Link
              to="/students/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Student</span>
              <span className="sm:hidden">Add</span>
            </Link>
          )}
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["students"] })
            }
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{statusCounts?.total || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {statusCounts?.active || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {statusCounts?.inactive || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <UserX className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Archived</p>
                <p className="text-2xl font-bold text-gray-600">
                  {statusCounts?.archived || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Archive className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Filter students by status, slot, or search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-3"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Slot Filter */}
            <div className="w-full sm:w-auto">
              <Select value={slotFilter} onValueChange={handleSlotFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Slot" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">All Slots</SelectItem>
                  {slotsData?.map((slot: Slot) => (
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

      {/* Students Table */}
      <Card className="bg-card border border-border shadow-sm">
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>
            Showing {studentsData?.data.length || 0} of{" "}
            {studentsData?.pagination.total || 0} students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {studentsData?.data.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No students found</h3>
              <p className="text-muted-foreground mb-6">
                {hasFilters
                  ? "Try adjusting your filters to see more results"
                  : "Get started by adding your first student"}
              </p>
              {hasPermission("SUPER_ADMIN") && !hasFilters && (
                <Link
                  to="/students/new"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Add First Student
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {studentsData?.data.map((student) => (
                  <Card
                    key={student._id}
                    className="bg-card border border-border shadow-sm"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{student.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {student.phone}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 w-10">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            side="bottom"
                            sideOffset={8}
                            className="bg-white"
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/students/${student._id}`)
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/students/${student._id}?tab=fees`)
                              }
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Fee History
                            </DropdownMenuItem>
                            {hasPermission("SUPER_ADMIN") && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(
                                      `/fees/mark-payment?studentId=${student._id}`,
                                    )
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Payment
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigate(`/students/${student._id}/edit`)
                                  }
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {student.status !== "ARCHIVED" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleArchive(student)}
                                    >
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <Badge
                            variant={
                              student.status === "ACTIVE"
                                ? "secondary"
                                : student.status === "INACTIVE"
                                  ? "secondary"
                                  : "secondary"
                            }
                          >
                            {student.status}
                          </Badge>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Monthly Fee
                          </span>
                          <span className="font-medium">
                            {formatCurrency(student.monthlyFee)}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Joined</span>
                          <span>{formatDate(student.joiningDate)}</span>
                        </div>

                        {student.slotId && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Slot</span>
                            <span className="font-medium">
                              {typeof student.slotId === "object"
                                ? student.slotId.name
                                : slotsData?.find(
                                    (s: Slot) => s._id === student.slotId,
                                  )?.name || "N/A"}
                            </span>
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
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Monthly Fee</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsData?.data.map((student) => (
                      <TableRow key={student._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                              style={{
                                backgroundColor: stringToColor(student.name),
                              }}
                            >
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{student.name}</div>
                              {student.email && (
                                <div className="text-sm text-muted-foreground">
                                  {truncateText(student.email, 20)}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{student.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === "ACTIVE"
                                ? "secondary"
                                : student.status === "INACTIVE"
                                  ? "secondary"
                                  : "secondary"
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(student.monthlyFee)}
                        </TableCell>
                        <TableCell>
                          {student.slotId
                            ? typeof student.slotId === "object"
                              ? student.slotId.name
                              : slotsData?.find(
                                  (s: Slot) => s._id === student.slotId,
                                )?.name
                            : "N/A"}
                        </TableCell>
                        <TableCell>{formatDate(student.joiningDate)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 w-10">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              side="bottom"
                              sideOffset={8}
                              className="bg-white"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/students/${student._id}`)
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/students/${student._id}?tab=fees`)
                                }
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Fee History
                              </DropdownMenuItem>
                              {hasPermission("SUPER_ADMIN") && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(
                                        `/fees/mark-payment?studentId=${student._id}`,
                                      )
                                    }
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Mark Payment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(`/students/${student._id}/edit`)
                                    }
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  {student.status !== "ARCHIVED" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => handleArchive(student)}
                                      >
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </>
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
              {studentsData?.pagination.pages &&
                studentsData.pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {studentsData.pagination.pages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from(
                          {
                            length: Math.min(3, studentsData.pagination.pages),
                          },
                          (_, i) => {
                            let pageNum;
                            if (studentsData.pagination.pages <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage === 1) {
                              pageNum = i + 1;
                            } else if (
                              currentPage === studentsData.pagination.pages
                            ) {
                              pageNum = studentsData.pagination.pages - 2 + i;
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
                                onClick={() => handlePageChange(pageNum)}
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
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === studentsData.pagination.pages}
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

      {/* Archive Dialog */}
      <Dialog
        open={archiveDialog.open}
        onOpenChange={(open) =>
          setArchiveDialog({ open, student: archiveDialog.student })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive {archiveDialog.student?.name}?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Student Details</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{archiveDialog.student?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{archiveDialog.student?.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Fee:</span>
                  <span>
                    {formatCurrency(archiveDialog.student?.monthlyFee || 0)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Archival
              </label>
              <Input
                placeholder="Enter reason (optional)"
                id="archive-reason"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchiveDialog({ open: false, student: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (archiveDialog.student) {
                  const reason =
                    (
                      document.getElementById(
                        "archive-reason",
                      ) as HTMLInputElement
                    )?.value || "Archived by admin";
                  archiveMutation.mutate({
                    studentId: archiveDialog.student._id,
                    reason,
                  });
                }
              }}
              loading={archiveMutation.isPending}
            >
              Archive Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper function for avatar colors
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
