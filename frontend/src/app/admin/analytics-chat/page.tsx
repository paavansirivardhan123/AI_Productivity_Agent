"use client";

import { useState, useRef, useEffect } from "react";
import { Send, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AdminAnalyticsChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  // Stable chat session id for this admin analytics session
  const chatIdRef = useRef(crypto.randomUUID());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAsk = async () => {
    const text = query.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setQuery("");
    setLoading(true);
    try {
      // Create the chat session on first message
      if (messages.length === 0) {
        await api("/chats", {
          method: "POST",
          body: JSON.stringify({ id: chatIdRef.current, title: "Analytics Chat" }),
        });
      }
      const formData = new FormData();
      formData.append("message", text);
      formData.append("agent", "chat");
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/ai/chat?chatId=${chatIdRef.current}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.content || "No response." }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = ["How many users are registered?", "Which features are most used?", "How many premium users?"];

  return (
    <div className="p-8 h-full flex flex-col max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <BarChart2 className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Analytics Chat</h1>
        </div>
        <p className="text-muted-foreground">Ask questions about your platform data in natural language</p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display">Query your analytics</CardTitle>
          <CardDescription>Ask about users, activity, and platform stats</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-6">Ask a question about your platform metrics</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {suggestions.map((s) => (
                    <Button key={s} variant="outline" size="sm" className="rounded-xl" onClick={() => setQuery(s)}>
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-5 py-4 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted/80 border rounded-bl-md"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/80 border rounded-2xl rounded-bl-md px-5 py-4">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-3 shrink-0">
            <Input
              placeholder="Ask about your data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              disabled={loading}
              className="rounded-xl"
            />
            <Button onClick={handleAsk} disabled={loading || !query.trim()} className="rounded-xl shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
