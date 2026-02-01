import { useMemo } from "react";
import { getMonthName } from "@/lib/utils";

export const useMonthlyTrendData = () => {
  return useMemo(() => {
    // Create deterministic mock data
    const trendData = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.getMonth();
      const year = date.getFullYear();

      // Deterministic mock data based on index
      const paid = 20 + ((i * 5) % 30);
      const due = (i * 3) % 15;

      return {
        name: `${getMonthName(month).slice(0, 3)} ${year}`,
        paid,
        due,
        paidAmount: paid * 1000,
        dueAmount: due * 1000,
      };
    }).reverse();
    return trendData;
  }, []);
};

export const useSlotCollectionData = (
  slotsData: Array<{ name: string; monthlyFee: number; occupiedSeats: number }>,
) => {
  return useMemo(
    () =>
      slotsData?.map((slot) => ({
        name: slot.name,
        expected: slot.occupiedSeats * slot.monthlyFee,
        collected: Math.floor(slot.occupiedSeats * slot.monthlyFee * 0.8),
      })) || [],
    [slotsData],
  );
};

interface PaymentData {
  details?: Array<{
    studentId: string;
    studentName: string;
    studentStatus: string;
    month: number;
    year: number;
    baseFee: number;
    dueCarriedForward: number;
    totalAmount: number;
    status: string;
    coveredByAdvance: boolean;
    locked: boolean;
    paymentDate?: Date;
  }>;
  stats?: {
    total?: number;
    paid?: number;
    due?: number;
    pending?: number;
    totalAmount?: number;
    paidAmount?: number;
    dueAmount?: number;
    pendingAmount?: number;
  };
}

export const usePerformanceMetrics = (
  slotCollectionData: Array<{
    name: string;
    expected: number;
    collected: number;
  }>,
  paymentData?: PaymentData,
) => {
  return useMemo(() => {
    const totalAdvanceBalance =
      paymentData?.details?.reduce((sum: number) => sum, 0) || 0;

    return [
      {
        title: "Best Performing Slot",
        value:
          slotCollectionData.length > 0
            ? slotCollectionData.reduce((max, slot) =>
                slot.collected / slot.expected > max.collected / max.expected
                  ? slot
                  : max,
              ).name
            : "N/A",
        description: "Highest collection rate",
        trend: "positive" as const,
      },
      {
        title: "Lowest Performing Slot",
        value:
          slotCollectionData.length > 0
            ? slotCollectionData.reduce((min, slot) =>
                slot.collected / slot.expected < min.collected / min.expected
                  ? slot
                  : min,
              ).name
            : "N/A",
        description: "Needs attention",
        trend: "negative" as const,
      },
      {
        title: "Total Advance Balance",
        value: `₹${totalAdvanceBalance.toLocaleString("en-IN")}`,
        description: "Unutilized advance",
        trend: "neutral" as const,
      },
      {
        title: "Total Overdue Amount",
        value: `₹${(paymentData?.stats?.dueAmount || 0).toLocaleString("en-IN")}`,
        description: "Requires immediate action",
        trend: "negative" as const,
      },
    ];
  }, [slotCollectionData, paymentData]);
};
