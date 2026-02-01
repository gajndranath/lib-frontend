import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, DollarSign, AlertCircle, FileText } from "lucide-react";

interface QuickActionsProps {
  hasPermission: (permission: string) => boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  hasPermission,
}) => {
  const actions = [
    {
      to: "/fees/mark-payment",
      icon: CreditCard,
      title: "Mark Payment",
      description: "Record payment",
    },
    {
      to: "/fees/advance",
      icon: DollarSign,
      title: "Add Advance",
      description: "Add advance payment",
    },
    {
      to: "/fees/due",
      icon: AlertCircle,
      title: "Due Tracking",
      description: "Track overdue payments",
    },
    {
      to: "/fees/receipts",
      icon: FileText,
      title: "Receipts",
      description: "Generate receipts",
    },
  ];

  if (!hasPermission("SUPER_ADMIN")) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common fee management tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {actions.map((action) => (
            <Button
              key={action.to}
              variant="outline"
              className="h-auto py-4"
              asChild
            >
              <Link to={action.to} className="flex items-center">
                <action.icon className="h-5 w-5 mr-2" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
