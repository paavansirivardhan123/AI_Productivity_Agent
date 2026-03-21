import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useChatStore } from "@/store/chat-store";

export type UserRole = "user" | "admin" | "super_admin";
export type SubscriptionType = "free" | "premium";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subscriptionType: SubscriptionType;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isPremium: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem("token", token);
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("chat-storage");
        localStorage.removeItem("auth-storage");
        const chatStore = useChatStore.getState();
        chatStore.resetState();
        set({ user: null, token: null });
        if (typeof window !== "undefined") {
          // Full navigation clears all in-memory state including loadedRef
          window.location.href = "/login";
        }
      },
      isAdmin: () => ["admin", "super_admin"].includes(get().user?.role ?? ""),
      isPremium: () => get().user?.subscriptionType === "premium",
    }),
    { name: "auth-storage" }
  )
);
