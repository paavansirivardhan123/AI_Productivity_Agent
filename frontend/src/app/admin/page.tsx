"use client";

import {
  Users,
  Crown,
  Activity,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const usageData = [
  { day: "Mon", users: 240, sessions: 420 },
  { day: "Tue", users: 280, sessions: 510 },
  { day: "Wed", users: 320, sessions: 590 },
  { day: "Thu", users: 290, sessions: 540 },
  { day: "Fri", users: 350, sessions: 620 },
  { day: "Sat", users: 180, sessions: 310 },
  { day: "Sun", users: 150, sessions: 280 },
];

const revenueData = [
  { month: "Oct", revenue: 4200 },
  { month: "Nov", revenue: 5100 },
  { month: "Dec", revenue: 5800 },
  { month: "Jan", revenue: 6200 },
  { month: "Feb", revenue: 8457 },
];

const featureData = [
  { name: "AI Chat", value: 72, fill: "hsl(var(--primary))" },
  { name: "Scheduler", value: 45, fill: "hsl(var(--primary) / 0.8)" },
  { name: "Documents", value: 28, fill: "hsl(var(--primary) / 0.6)" },
];

const stats = [
  { label: "Total Users", value: "2,847", icon: Users, trend: "+12%" },
  { label: "Premium", value: "423", icon: Crown, trend: "+8%" },
  { label: "Active Sessions", value: "156", icon: Activity, trend: "+23%" },
  { label: "Revenue (MTD)", value: "$8,457", icon: DollarSign, trend: "+18%" },
];

export default function AdminDashboardPage() {
  return (
    <div className="p-4 sm:p-8 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Platform overview</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl border-2 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-5 w-5 text-primary/60" strokeWidth={1.5} />
            </CardHeader>
            <CardContent>
              <div className="font-display text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.trend} vs last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Usage trends
            </CardTitle>
            <CardDescription>Last 7 days - active users & sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sessions"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="hsl(var(--primary) / 0.7)"
                    fill="hsl(var(--primary) / 0.1)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Revenue
            </CardTitle>
            <CardDescription>Monthly revenue (last 5 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                    }}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-2 overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Feature popularity
          </CardTitle>
          <CardDescription>Usage share this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid hsl(var(--border))",
                  }}
                  formatter={(v: number) => [`${v}%`, "Usage"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
