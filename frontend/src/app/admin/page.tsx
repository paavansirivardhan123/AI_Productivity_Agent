"use client";

import { useEffect, useState } from "react";
import { Users, Crown, Activity, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchAdminStats, fetchUsageTrends, type AdminStats, type UsageTrend } from "@/lib/api-services";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, premiumUsers: 0, activeSessions: 0, revenueMTD: 0 });
  const [trends, setTrends] = useState<UsageTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, t] = await Promise.all([fetchAdminStats(), fetchUsageTrends()]);
        setStats(s);
        setTrends(t);
      } catch (e) {
        console.error("Failed to load admin stats", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statCards = [
    { label: "Total Users",     value: stats.totalUsers,     icon: Users },
    { label: "Premium",         value: stats.premiumUsers,   icon: Crown },
    { label: "Active Sessions", value: stats.activeSessions, icon: Activity },
    { label: "Revenue (MTD)",   value: `$${stats.revenueMTD}`, icon: DollarSign },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Platform overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((s) => (
          <Card key={s.label} className="rounded-2xl border-2 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="h-5 w-5 text-primary/60" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold">
                {loading ? "—" : s.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage trends chart */}
      <Card className="rounded-2xl border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Usage trends
          </CardTitle>
          <CardDescription>Last 7 days — chats, schedules, documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Loading...</div>
            ) : trends.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No activity data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="chats"     stroke="hsl(var(--primary))"       fill="hsl(var(--primary) / 0.2)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="schedules" stroke="hsl(var(--primary) / 0.7)" fill="hsl(var(--primary) / 0.1)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="documents" stroke="hsl(var(--primary) / 0.4)" fill="hsl(var(--primary) / 0.05)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
