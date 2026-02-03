import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Search,
  Plus,
  MoreVertical,
  Calendar,
  Users,
  DollarSign,
  Clock,
  Edit,
  Trash2,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { slotApi } from "@/api/slot.api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/utils";
import type { Slot } from "@/types";

export const SlotList: React.FC = () => {
  const { hasPermission } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    slot: Slot | null;
  }>({
    open: false,
    slot: null,
  });

  // Fetch slots
  const { data: slotsData, isLoading } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => {
      const { data, error } = await slotApi.getAllSlots();
      if (error) throw error;
      return data?.data;
    },
  });

  // Delete slot mutation
  const deleteMutation = useMutation({
    mutationFn: ({ slotId, reason }: { slotId: string; reason: string }) =>
      slotApi.deleteSlot(slotId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      toast.success("Slot deactivated successfully");
      setDeleteDialog({ open: false, slot: null });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to deactivate slot");
    },
  });

  // Filter slots
  const filteredSlots = slotsData?.filter((slot) => {
    // Search filter
    if (
      searchQuery &&
      !slot.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Status filter
    if (statusFilter !== "ALL") {
      const isActive = slot.isActive;
      if (statusFilter === "ACTIVE" && !isActive) return false;
      if (statusFilter === "INACTIVE" && isActive) return false;
    }

    return true;
  });

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const totalPages = filteredSlots
    ? Math.ceil(filteredSlots.length / ITEMS_PER_PAGE)
    : 1;
  const paginatedSlots = filteredSlots?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Handle delete
  const handleDelete = (slot: Slot) => {
    setDeleteDialog({ open: true, slot });
  };

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["slots"] });
    toast.success("Slot data refreshed");
  };

  // Handle export
  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  const hasFilters = searchQuery || statusFilter !== "ALL";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Slots</h1>
            <p className="text-muted-foreground">Loading slots...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Slots</h1>
          <p className="text-muted-foreground">
            Manage library time slots and seat allocation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission("SUPER_ADMIN") && (
            <Link to="/slots/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Create Slot</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          )}
          <Button variant="outline" size="icon" onClick={handleExport}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Slots</p>
                <p className="text-2xl font-bold">{slotsData?.length || 0}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Slots</p>
                <p className="text-2xl font-bold text-green-600">
                  {slotsData?.filter((s) => s.isActive).length || 0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Seats</p>
                <p className="text-2xl font-bold">
                  {slotsData?.reduce((acc, slot) => acc + slot.totalSeats, 0) ||
                    0}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Fee</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    slotsData?.length
                      ? slotsData.reduce(
                          (acc, slot) => acc + slot.monthlyFee,
                          0,
                        ) / slotsData.length
                      : 0,
                  )}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Filter slots by status or search by name
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by slot name..."
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
                onValueChange={(value: "ALL" | "ACTIVE" | "INACTIVE") =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
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

      {/* Slots Table */}
      <Card>
        <CardHeader>
          <CardTitle>Slot List</CardTitle>
          <CardDescription>
            Showing {paginatedSlots?.length || 0} of{" "}
            {filteredSlots?.length || 0} slots
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paginatedSlots?.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No slots found</h3>
              <p className="text-muted-foreground mb-6">
                {hasFilters
                  ? "Try adjusting your filters to see more results"
                  : "Get started by creating your first slot"}
              </p>
              {hasPermission("SUPER_ADMIN") && !hasFilters && (
                <Link to="/slots/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Slot
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden space-y-4">
                {paginatedSlots?.map((slot) => (
                  <Card key={slot._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{slot.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {slot.timeRange.start} - {slot.timeRange.end}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white">
                            <DropdownMenuItem>
                              <Link
                                to={`/slots/${slot._id}`}
                                className="flex items-center"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            {hasPermission("SUPER_ADMIN") && (
                              <>
                                <DropdownMenuItem>
                                  <Link
                                    to={`/slots/${slot._id}/edit`}
                                    className="flex items-center"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                                {slot.isActive && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDelete(slot)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Deactivate
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
                            variant={slot.isActive ? "default" : "secondary"}
                          >
                            {slot.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Monthly Fee
                          </span>
                          <span className="font-medium">
                            {formatCurrency(slot.monthlyFee)}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Seats</span>
                          <span>
                            <span className="font-medium">
                              {slot.occupiedSeats || 0}
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span>{slot.totalSeats}</span>
                            <span className="text-muted-foreground ml-2">
                              ({slot.occupancyPercentage || 0}%)
                            </span>
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Available
                          </span>
                          <span className="font-medium">
                            {slot.availableSeats || 0} seats
                          </span>
                        </div>
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
                      <TableHead>Slot Name</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Monthly Fee</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Occupancy</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSlots?.map((slot) => (
                      <TableRow key={slot._id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div>{slot.name}</div>
                              <div className="text-xs text-muted-foreground">
                                ID: {slot._id.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {slot.timeRange.start} - {slot.timeRange.end}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={slot.isActive ? "default" : "secondary"}
                          >
                            {slot.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(slot.monthlyFee)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {slot.occupiedSeats || 0}/{slot.totalSeats}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {slot.availableSeats || 0} available
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${slot.occupancyPercentage || 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm">
                              {slot.occupancyPercentage || 0}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white"
                            >
                              <DropdownMenuItem>
                                <Link
                                  to={`/slots/${slot._id}`}
                                  className="flex items-center"
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {hasPermission("SUPER_ADMIN") && (
                                <>
                                  <DropdownMenuItem>
                                    <Link
                                      to={`/slots/${slot._id}/edit`}
                                      className="flex items-center"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </Link>
                                  </DropdownMenuItem>
                                  {slot.isActive && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-red-600"
                                        onClick={() => handleDelete(slot)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Deactivate
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
                                currentPage === pageNum ? "default" : "outline"
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

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({ open, slot: deleteDialog.slot })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Slot</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {deleteDialog.slot?.name}?
              This will make the slot inactive and prevent new students from
              joining.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                    Important Considerations
                  </h4>
                  <ul className="text-sm space-y-1 text-yellow-700 dark:text-yellow-400">
                    <li>• Existing students will remain in this slot</li>
                    <li>• No new students can be assigned to this slot</li>
                    <li>• Slot will be marked as inactive</li>
                    <li>• Can be reactivated later if needed</li>
                    <li>• Monthly fees for existing students will continue</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Slot Details</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span>{deleteDialog.slot?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>
                    {deleteDialog.slot?.timeRange.start} -{" "}
                    {deleteDialog.slot?.timeRange.end}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Students:</span>
                  <span>
                    {deleteDialog.slot?.occupiedSeats || 0} currently enrolled
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Fee:</span>
                  <span>
                    {formatCurrency(deleteDialog.slot?.monthlyFee || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Reason for Deactivation
              </label>
              <Input
                placeholder="Enter reason (optional)"
                id="deactivate-reason"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, slot: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteDialog.slot) {
                  const reason =
                    (
                      document.getElementById(
                        "deactivate-reason",
                      ) as HTMLInputElement
                    )?.value || "Deactivated by admin";
                  deleteMutation.mutate({
                    slotId: deleteDialog.slot._id,
                    reason,
                  });
                }
              }}
              loading={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Deactivate Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
