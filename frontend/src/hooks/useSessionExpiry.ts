"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

const CHECK_INTERVAL = 60000; // 1 min

export function useSessionExpiry() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const handleExpired = () => {
      logout();
      router.replace("/login?expired=1");
    };

    window.addEventListener("auth-expired", handleExpired);

    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem("token");
          handleExpired();
        }
      } catch {
        // Invalid token format - ignore
      }
    }, CHECK_INTERVAL);

    return () => {
      window.removeEventListener("auth-expired", handleExpired);
      clearInterval(interval);
    };
  }, [logout, router]);
}
