import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  Bell,
  BarChart3,
  Shield,
  FileText,
  Activity,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUIStore } from "@/store/ui.store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/students", label: "Students", icon: Users },
  { to: "/slots", label: "Slots", icon: Calendar },
  { to: "/fees", label: "Fees", icon: DollarSign },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

const adminNavItems = [
  { to: "/admin/staff", label: "Staff Management", icon: Shield },
  { to: "/admin/reminders", label: "Reminders", icon: Bell },
  { to: "/admin/due-report", label: "Month-End Due Report", icon: FileText },
  { to: "/admin/audit", label: "Audit Log", icon: FileText },
];

export const Sidebar: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { sidebarOpen, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Mobile header */}
      <div className="flex items-center justify-between p-4 lg:hidden border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">LMS</span>
          </div>
          <span className="font-semibold text-lg">Library MS</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(false)}
          className="h-8 w-8"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  "hover:bg-primary/10 hover:text-primary hover:scale-[1.02]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground",
                )
              }
              onClick={() => setMobileSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}

          {isSuperAdmin && (
            <>
              <Separator className="my-4" />
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Admin Panel
                  </p>
                </div>
              </div>
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                      "hover:bg-primary/10 hover:text-primary hover:scale-[1.02]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground",
                    )
                  }
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </ScrollArea>

      <div className="border-t bg-muted/30 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-background/50 p-3 border">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-success/20 to-success/10 flex items-center justify-center border border-success/20">
            <Activity className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">System Status</p>
            <p className="text-xs text-muted-foreground truncate">
              All services online
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-30 hidden h-[calc(100vh-4rem)] w-64 border-r bg-card/50 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:block",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-72 border-r bg-background shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
