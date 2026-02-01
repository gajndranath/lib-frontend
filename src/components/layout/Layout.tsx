import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useUIStore } from "@/store/ui.store";
import { cn } from "@/lib/utils";

export const Layout: React.FC = () => {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header />
      <div className="flex h-[calc(100vh-4rem)]">
        <Sidebar />
        <main
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out overflow-auto",
            sidebarOpen ? "lg:ml-64" : "lg:ml-0",
          )}
        >
          <div className="container max-w-7xl py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
