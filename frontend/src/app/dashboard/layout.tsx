"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token") ?? undefined
        : undefined;
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <DashboardLayout>
      <div className="flex flex-col flex-1 min-h-0">
        <DashboardNavbar />
        <main className="flex-1 overflow-auto bg-background/50">
          <div className="h-full">{children}</div>
        </main>
      </div>
    </DashboardLayout>
  );
}
