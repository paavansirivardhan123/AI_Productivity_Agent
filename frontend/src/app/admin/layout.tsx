"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, MessageSquare, LogOut, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!t) {
      router.replace("/login");
      return;
    }
    const { user } = useAuthStore.getState();
    const role = user?.role;
    if (role !== "admin" && role !== "super_admin") {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 border-r-2 bg-card/30 backdrop-blur-xl flex flex-col">
        <div className="p-5 border-b-2">
          <span className="font-display font-semibold tracking-tight">
            Admin
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <Link href="/admin">
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl" size="sm">
              <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl" size="sm">
              <Users className="h-4 w-4" strokeWidth={1.5} />
              Users
            </Button>
          </Link>
          <Link href="/admin/analytics-chat">
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl" size="sm">
              <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              Analytics Chat
            </Button>
          </Link>
          <Link href="/admin/activity">
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl" size="sm">
              <Activity className="h-4 w-4" strokeWidth={1.5} />
              Activity logs
            </Button>
          </Link>
        </nav>
        <div className="p-3 border-t-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl text-muted-foreground"
            size="sm"
            onClick={() => logout()}
            asChild
          >
            <Link href="/">
              <LogOut className="h-4 w-4" />
              Logout
            </Link>
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto grain">{children}</main>
    </div>
  );
}
