import React, { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Download,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useStudents, useToggleReminder } from "@/hooks/useStudents";
import { StudentForm } from "@/components/students/StudentForm";
import { StudentStatus } from "@/types/api.types";
import { format } from "date-fns";

export const StudentsPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  // Remove unused selectedStudent state
  // const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const {
    data: studentsData,
    isLoading,
    refetch,
  } = useStudents({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const toggleReminder = useToggleReminder();

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleToggleReminder = (studentId: string, currentState: boolean) => {
    toggleReminder.mutate({ studentId, pause: !currentState });
  };

  const handleExport = () => {
    toast.info("Export feature coming soon");
  };

  const getStatusBadge = (status: StudentStatus) => {
    const config = {
      ACTIVE: { label: "Active", variant: "default" as const },
      INACTIVE: { label: "Inactive", variant: "secondary" as const },
      ARCHIVED: { label: "Archived", variant: "outline" as const },
    }[status];

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Students Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage all student records, fees, and payment history
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <StudentForm
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students by name or phone..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Students List</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {studentsData?.total || 0} Students
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <StudentsTableSkeleton />
          ) : studentsData?.data.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 text-gray-300 mb-4">
                <Users className="w-full h-full" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No students found
              </h3>
              <p className="text-gray-500 mt-2">
                {search
                  ? "Try a different search term"
                  : "Get started by adding your first student"}
              </p>
              {!search && (
                <Button
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Student
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Joining Date</TableHead>
                      <TableHead>Monthly Fees</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reminders</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentsData?.data.map((student) => (
                      <TableRow key={student._id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{student.name}</div>
                            <div className="text-xs text-gray-500">
                              ID: {student._id.slice(-6)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span className="text-sm">{student.phone}</span>
                            </div>
                            {student.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span className="text-sm text-gray-500">
                                  {student.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span className="text-sm">
                              {format(
                                new Date(student.joiningDate),
                                "dd/MM/yyyy"
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            ₹{student.monthlyFees}
                          </div>
                          <div className="text-xs text-gray-500">
                            Billing Day: {student.billingDay}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={
                              student.reminderPaused ? "outline" : "default"
                            }
                            onClick={() =>
                              handleToggleReminder(
                                student._id,
                                student.reminderPaused
                              )
                            }
                            disabled={toggleReminder.isPending}
                          >
                            {student.reminderPaused ? "Resume" : "Pause"}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  // Navigate to student details
                                  window.location.href = `/students/${student._id}`;
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Are you sure you want to delete ${student.name}?`
                                    )
                                  ) {
                                    // Implement delete
                                    toast.info("Delete feature coming soon");
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {studentsData && studentsData.total > 0 && (
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, studentsData.total)} of{" "}
                {studentsData.total} students
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= studentsData.total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentsData?.data.filter((s) => s.status === "ACTIVE").length ||
                0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Currently enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {studentsData?.data.reduce((sum, s) => sum + s.monthlyFees, 0) ||
                0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Expected this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Reminders Paused
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {studentsData?.data.filter((s) => s.reminderPaused).length || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">No notifications sent</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StudentsTableSkeleton: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between p-4 border rounded-lg"
      >
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    ))}
  </div>
);
