import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  tokenUsage: TokenUsage;
  setActiveSession: (id: string | null) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (sessionId: string, messageId: string, content: string) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  addTokenUsage: (prompt: number, completion: number) => void;
  resetTokenUsage: (sessionId?: string) => void;
  getActiveSession: () => ChatSession | null;
  removeSession: (id: string) => void;
}

const persistOptions = {
  name: "chat-storage",
  partialize: (s: ChatState) => ({
    sessions: s.sessions,
    activeSessionId: s.activeSessionId,
    tokenUsage: s.tokenUsage,
  }),
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      setActiveSession: (id) => set({ activeSessionId: id }),
      addSession: (session) =>
        set((s) => ({ sessions: [session, ...s.sessions] })),
      updateSession: (id, updates) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, ...updates } : sess
          ),
        })),
      addMessage: (sessionId, message) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: [...sess.messages, message],
                  updatedAt: new Date(),
                }
              : sess
          ),
        })),
      updateMessage: (sessionId, messageId, content) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: sess.messages.map((m) =>
                    m.id === messageId ? { ...m, content } : m
                  ),
                  updatedAt: new Date(),
                }
              : sess
          ),
        })),
      deleteMessage: (sessionId, messageId) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? {
                  ...sess,
                  messages: sess.messages.filter((m) => m.id !== messageId),
                  updatedAt: new Date(),
                }
              : sess
          ),
        })),
      addTokenUsage: (prompt, completion) =>
        set((s) => ({
          tokenUsage: {
            prompt: s.tokenUsage.prompt + prompt,
            completion: s.tokenUsage.completion + completion,
            total: s.tokenUsage.total + prompt + completion,
          },
        })),
      resetTokenUsage: () =>
        set({ tokenUsage: { prompt: 0, completion: 0, total: 0 } }),
      getActiveSession: () => {
        const { sessions, activeSessionId } = get();
        return sessions.find((s) => s.id === activeSessionId) ?? null;
      },
      removeSession: (id) =>
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        })),
    }),
    persistOptions
  )
);
