"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Calendar,
  FileText,
  Settings,
  LogOut,
  Plus,
  Crown,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

const navItems = [
  { href: "/dashboard", icon: MessageSquare, label: "New Chat" },
  { href: "/dashboard/chat", icon: MessageSquare, label: "Chat History" },
  { href: "/dashboard/scheduler", icon: Calendar, label: "Scheduler" },
  { href: "/dashboard/documents", icon: FileText, label: "Documents" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { logout, isPremium } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-muted/20">
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden rounded-lg shadow-md"
        onClick={() => setMobileOpen((o) => !o)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      <aside
        className={cn(
          "md:flex flex-col border-r bg-card/80 backdrop-blur-sm shadow-sm transition-all duration-300 md:translate-x-0",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "flex fixed inset-y-0 left-0 z-40 shadow-2xl w-60" : "hidden"
        )}
      >
        <div className={cn(
          "flex h-16 items-center border-b bg-background/50 transition-all duration-300",
          collapsed ? "justify-center px-2" : "gap-2.5 px-5"
        )}>
          <div className={cn("flex items-center gap-2.5", collapsed && "flex-col gap-0")}>
            <div className="rounded-lg bg-primary p-1.5 shadow">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className={cn(
              "font-display text-base font-bold tracking-tight whitespace-nowrap transition-all duration-300",
              collapsed && "opacity-0 w-0 h-0 overflow-hidden"
            )}>
              ProdAgent
            </span>
          </div>
        </div>
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <p className={cn(
            "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 transition-all duration-300",
            collapsed && "opacity-0 w-0 overflow-hidden"
          )}>
            Workspace
          </p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-lg h-7 w-7 shrink-0 hover:bg-primary/10 hover:scale-110 transition-all duration-200 -mr-1"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 transition-transform" />
            ) : (
              <ChevronLeft className="h-4 w-4 transition-transform" />
            )}
          </Button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 overflow-y-auto scrollbar-thin scrollbar-thumb-muted/20 hover:scrollbar-thumb-muted/40">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block">
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]",
                pathname === "/dashboard"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? "New chat" : undefined}
            >
              <Plus className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              <span className={cn("transition-all duration-300", collapsed && "opacity-0 w-0 overflow-hidden")}>New chat</span>
            </button>
          </Link>
          {navItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block">
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-[1.02]",
                  pathname.startsWith(item.href) && item.href !== "/dashboard"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                <span className={cn("transition-all duration-300", collapsed && "opacity-0 w-0 overflow-hidden")}>{item.label}</span>
              </button>
            </Link>
          ))}
        </nav>
        {!isPremium() && (
          <div className="px-3 pb-3">
            {!collapsed && (
              <div className="mb-2 px-1">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Account
                </p>
              </div>
            )}
            <Link href="/dashboard/upgrade" className="block">
              <button 
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 text-primary hover:from-primary/15 hover:to-primary/10 hover:border-primary/50 hover:scale-[1.02] transition-all duration-200 shadow-sm hover:shadow",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? "Upgrade to Pro" : undefined}
              >
                <Crown className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} />
                <span className={cn("transition-all duration-300", collapsed && "opacity-0 w-0 overflow-hidden")}>Upgrade to Pro</span>
              </button>
            </Link>
          </div>
        )}
        <div className="border-t bg-muted/30 px-3 py-3">
          <button
            onClick={() => {
              logout();
              setMobileOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            <span className={cn("transition-all duration-300", collapsed && "opacity-0 w-0 overflow-hidden")}>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
