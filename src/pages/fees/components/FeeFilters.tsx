import React from "react";
import { Search, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FeeStatus } from "@/types";

interface FeeFiltersProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  statusFilter: FeeStatus | "ALL";
  setStatusFilter: (value: FeeStatus | "ALL") => void;
  slotFilter: string;
  setSlotFilter: (value: string) => void;
  slots: Array<{ _id: string; name: string }>;
  hasFilters: boolean;
  clearFilters: () => void;
}

export const FeeFilters: React.FC<FeeFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  slotFilter,
  setSlotFilter,
  slots,
  hasFilters,
  clearFilters,
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Filters</CardTitle>
        <CardDescription>
          Filter fee records by student, status, or slot
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by student name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-auto">
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as FeeStatus | "ALL")
              }
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter by status" />
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
            <Select value={slotFilter} onValueChange={setSlotFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter by slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Slots</SelectItem>
                {slots?.map((slot) => (
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
              size="icon"
              onClick={clearFilters}
              title="Clear filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
