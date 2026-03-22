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
  const { token, setAuth, logout } = useAuthStore();
  const { addSession, resetState } = useChatStore();
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const validateAndLoad = async (activeToken: string) => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (!res.ok) throw new Error("Session invalid");
        const { user: freshUser } = await res.json();
        setAuth(freshUser, activeToken);

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

    // Google OAuth redirect — token arrives as ?google_token=xxx
    const params = new URLSearchParams(window.location.search);
    const googleToken = params.get("google_token");
    if (googleToken) {
      window.history.replaceState({}, "", window.location.pathname);
      validateAndLoad(googleToken);
      return;
    }

    if (!token) {
      router.replace("/login");
      setLoading(false);
      return;
    }

    validateAndLoad(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
