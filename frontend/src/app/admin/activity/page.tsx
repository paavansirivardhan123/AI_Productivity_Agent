"use client";

import { useState } from "react";
import { Activity, Filter, User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const mockLogs = [
  { id: "1", userId: "user-1", userName: "John Doe", action: "Chat session started", timestamp: "2025-02-21 14:32", details: "Session #abc123" },
  { id: "2", userId: "user-2", userName: "Jane Smith", action: "Schedule generated", timestamp: "2025-02-21 14:28", details: "React learning plan" },
  { id: "3", userId: "user-1", userName: "John Doe", action: "Document uploaded", timestamp: "2025-02-21 14:15", details: "report.pdf" },
  { id: "4", userId: "user-3", userName: "Alex Lee", action: "Upgraded to Premium", timestamp: "2025-02-21 13:45", details: "" },
  { id: "5", userId: "user-2", userName: "Jane Smith", action: "Login", timestamp: "2025-02-21 13:30", details: "" },
];

export default function AdminActivityPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = mockLogs.filter((log) => {
    const matchSearch =
      !search ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Activity className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Activity logs
          </h1>
        </div>
        <p className="text-muted-foreground">
          Monitor user actions across the platform
        </p>
      </div>

      <Card className="rounded-2xl border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display">Recent activity</CardTitle>
          <CardDescription>Last 24 hours</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or action..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 rounded-xl"
              />
            </div>
          </div>
          <div className="rounded-xl border-2 overflow-hidden">
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {filtered.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-muted/20 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{log.userName}</p>
                      <p className="text-sm text-muted-foreground">{log.action}</p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground sm:ml-auto shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
