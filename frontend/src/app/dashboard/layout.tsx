"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardNavbar } from "@/components/layout/DashboardNavbar";
import { useAuthStore } from "@/store/auth-store";
import { useChatStore } from "@/store/chat-store";
import { fetchChats } from "@/lib/api-services";
import { API_BASE } from "@/lib/api";

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, token, setAuth, logout } = useAuthStore();
  const { addSession, resetState } = useChatStore();
  const [loading, setLoading] = useState(true);
  // Prevent double-loading on re-renders
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    if (loadedRef.current) return;
    loadedRef.current = true;

    const validateAndLoad = async () => {
      try {
        // 1. Revalidate session with backend
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Session invalid");
        }

        const { user: freshUser } = await res.json();
        setAuth(freshUser, token);

        // 2. Always reset local state and reload from DB for this user
        resetState();
        const chats = await fetchChats();
        chats.forEach((chat) => {
          addSession({
            id: chat.id,
            title: chat.title,
            messages: chat.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp),
            })),
            updatedAt: new Date(chat.updatedAt),
          });
        });
      } catch (err) {
        console.error("Session validation failed:", err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    validateAndLoad();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) return null;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

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
