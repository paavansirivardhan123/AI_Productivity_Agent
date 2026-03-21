"use client";

import { useState, useEffect } from "react";
import { Activity, Filter, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchAdminActivityLogs } from "@/lib/api-services";

export default function AdminActivityPage() {
  const [search, setSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const serverLogs = await fetchAdminActivityLogs();
        setLogs(serverLogs);
      } catch (error) {
        console.error("Failed to fetch activity logs", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = logs.filter((log) =>
    !search ||
    log.userId?.toLowerCase().includes(search.toLowerCase()) ||
    log.action?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Activity className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Activity logs</h1>
        </div>
        <p className="text-muted-foreground">Monitor user actions across the platform</p>
      </div>

      <Card className="rounded-2xl border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display">Recent activity</CardTitle>
          <CardDescription>All user actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user or action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 rounded-xl"
            />
          </div>
          <div className="rounded-xl border-2 overflow-hidden">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No activity found</div>
              ) : (
                filtered.map((log) => (
                  <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 hover:bg-muted/20 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-full bg-primary/10 p-2 shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{log.userId}</p>
                        <p className="text-sm text-muted-foreground">{log.action}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground sm:ml-auto shrink-0">
                      {log.timestamp?.replace("T", " ").slice(0, 19)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
