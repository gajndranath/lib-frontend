import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface FeeStatsCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  textColor?: string;
  subtitle?: string | React.ReactNode;
}

export const FeeStatsCard: React.FC<FeeStatsCardProps> = ({
  title,
  amount,
  icon: Icon,
  iconColor,
  iconBgColor,
  textColor,
  subtitle,
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={`h-8 w-8 rounded-lg ${iconBgColor} flex items-center justify-center`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${textColor || ""}`}>
          {formatCurrency(amount)}
        </div>
        {subtitle && (
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
