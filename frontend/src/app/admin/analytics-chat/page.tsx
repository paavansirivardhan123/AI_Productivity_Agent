"use client";

import { useState } from "react";
import { Send, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminAnalyticsChatPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: query }]);
    setQuery("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const demo = `Based on the database: Most used feature is AI Chat (72%), followed by Scheduler (45%). Premium conversion rate is 14.8%. Active users in the last 24h: 156.`;
    setMessages((m) => [...m, { role: "assistant", content: demo }]);
    setLoading(false);
  };

  const suggestions = ["Most used features", "Premium conversion rate", "Active user count"];

  return (
    <div className="p-8 h-full flex flex-col max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <BarChart2 className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Analytics Chat
          </h1>
        </div>
        <p className="text-muted-foreground">
          Ask questions about your platform data in natural language
        </p>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 rounded-2xl border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display">Query your analytics</CardTitle>
          <CardDescription>e.g. &quot;Most used features&quot;, &quot;Premium conversion&quot;</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-6 mb-6">
            {messages.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-6">
                  Ask a question about your platform metrics
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {suggestions.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setQuery(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/80 border rounded-bl-md"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="Ask about your data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              disabled={loading}
              className="rounded-xl"
            />
            <Button
              onClick={handleAsk}
              disabled={loading || !query.trim()}
              className="rounded-xl shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
