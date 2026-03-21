"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { API_BASE } from "@/lib/api";

const CHECK_INTERVAL = 60 * 1000; // check every 60 seconds so role changes reflect quickly

export function useSessionExpiry() {
  const router = useRouter();
  const { logout, setAuth, token } = useAuthStore();

  useEffect(() => {
    const check = async () => {
      const t = localStorage.getItem("token");
      if (!t) return;
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.status === 401) {
          logout();
          router.replace("/login?expired=1");
          return;
        }
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            // Refresh user in store so any admin-made changes (role, subscription) reflect immediately
            setAuth(data.user, t);
          }
        }
      } catch {
        // network error — don't log out, just skip
      }
    };

    // Run immediately on mount, then on interval
    check();
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [logout, setAuth, router]);
}
