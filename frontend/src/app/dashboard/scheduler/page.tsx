"use client";

import { useState, useRef } from "react";
import {
  Calendar,
  Target,
  Clock,
  Sparkles,
  Download,
  ExternalLink,
  Crown,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { format, addDays, eachDayOfInterval, isSameDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateSchedule, syncScheduleToCalendar } from "@/lib/api-services";

interface Task {
  id: string;
  time: string;
  title: string;
  duration?: number;
}

interface DayPlan {
  date: string;
  tasks: Task[];
}

export default function SchedulerPage() {
  const { isPremium } = useAuthStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    goal: "",
    startDate: format(new Date(), "yyyy-MM-dd"),
    duration: "7",
    dailyHours: "4",
    gapDays: "1",
  });
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [currentScheduleId, setCurrentScheduleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingTask, setEditingTask] = useState<{ dayIdx: number; taskIdx: number } | null>(null);
  const [editValues, setEditValues] = useState({ time: "", title: "" });
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [exportStatus, setExportStatus] = useState<"idle" | "exporting">("idle");

  const handleGenerate = async () => {
    if (!form.goal.trim()) return;
    setLoading(true);

    const payload: any = {
      goal: form.goal,
      start_date: form.startDate,
      duration_days: form.duration,
      daily_hours: form.dailyHours,
      gap_days: form.gapDays,
      email: useAuthStore.getState().user?.email
    };

    try {
      const res = await generateSchedule(payload);
      // Backend returns SchedulePlan: {id, userId, title, goal, startDate, endDate, dailyPlans: [...] }
      // Frontend expects DayPlan[]: { date, tasks: {id, time, title, duration}[] }
      const newPlan: DayPlan[] = res.dailyPlans.map((dp: any) => ({
        date: dp.date,
        tasks: dp.tasks.map((t: any) => ({
          id: t.id,
          time: t.time,
          title: t.title,
          duration: t.duration
        })),
      }));
      setPlan(newPlan);
      setCurrentScheduleId(res.id);
    } catch (err) {
      console.error("Failed to generate schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarSync = async () => {
    if (!currentScheduleId || !isPremium()) return;
    setSyncStatus("syncing");
    try {
      await syncScheduleToCalendar(currentScheduleId);
      setSyncStatus("synced");
    } catch (err) {
      setSyncStatus("error");
    } finally {
      setTimeout(() => setSyncStatus("idle"), 2000);
    }
  };

  const updateTask = (dayIdx: number, taskIdx: number, updates: Partial<Task>) => {
    if (!plan) return;
    setPlan(
      plan.map((day, di) =>
        di === dayIdx
          ? {
            ...day,
            tasks: day.tasks.map((t, ti) =>
              ti === taskIdx ? { ...t, ...updates } : t
            ),
          }
          : day
      )
    );
    setEditingTask(null);
  };

  const handleExportPDF = () => {
    setExportStatus("exporting");
    const printContent = printRef.current;
    if (!printContent) {
      setExportStatus("idle");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) {
      setExportStatus("idle");
      return;
    }
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Schedule Export</title></head>
        <body style="font-family: system-ui; padding: 2rem;">
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    w.document.close();
    w.print();
    w.close();
    setExportStatus("idle");
  };


  const calendarDays = plan?.length
    ? (() => {
      const dates = plan.map((p) => new Date(p.date));
      const min = new Date(Math.min(...dates.map((d) => d.getTime())));
      const max = new Date(Math.max(...dates.map((d) => d.getTime())));
      const start = addDays(min, -min.getDay());
      const end = addDays(max, 6 - max.getDay());
      return eachDayOfInterval({ start, end });
    })()
    : [];

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Calendar className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Scheduler Agent
            </h1>
          </div>
          <p className="text-muted-foreground">
            Generate AI day-wise productivity plans from your goals
          </p>
        </div>

        <Card className="rounded-2xl border-2 overflow-hidden">
          <CardHeader>
            <CardTitle className="font-display">Create your plan</CardTitle>
            <CardDescription>Enter your goal and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Learning goal
              </label>
              <Input
                placeholder="e.g. Learn React fundamentals in 2 weeks"
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Start date</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block text-primary font-bold">Duration (Number of Days)</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  placeholder="e.g. 7"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Daily hours
                </label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={form.dailyHours}
                  onChange={(e) => setForm({ ...form, dailyHours: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Gap days</label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  placeholder="e.g. 1"
                  value={form.gapDays}
                  onChange={(e) => setForm({ ...form, gapDays: e.target.value })}
                />
              </div>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full gap-2 rounded-xl h-12 text-base font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "Generating..." : "Generate plan"}
            </Button>
          </CardContent>
        </Card>

        {plan && (
          <Card className="rounded-2xl border-2 overflow-hidden">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="font-display">Your schedule</CardTitle>
                <CardDescription>Day-wise productivity plan</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1"
                  onClick={handleExportPDF}
                  disabled={exportStatus === "exporting"}
                >
                  <Download className="h-4 w-4" />
                  {exportStatus === "exporting" ? "Exporting..." : "Export PDF"}
                </Button>
                {isPremium() ? (
                  <Button
                    size="sm"
                    className="rounded-xl gap-1"
                    onClick={handleCalendarSync}
                    disabled={syncStatus === "syncing"}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {syncStatus === "syncing"
                      ? "Syncing..."
                      : syncStatus === "synced"
                        ? "Synced!"
                        : "Sync Calendar"}
                  </Button>
                ) : (
                  <Badge variant="premium" className="gap-1 py-2 px-3 rounded-xl">
                    <Crown className="h-3.5 w-3.5" />
                    Premium to sync
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-xl mb-6">
                  <TabsTrigger value="list" className="rounded-lg">List</TabsTrigger>
                  <TabsTrigger value="timeline" className="rounded-lg">Timeline</TabsTrigger>
                  <TabsTrigger value="calendar" className="rounded-lg">Calendar</TabsTrigger>
                </TabsList>

                <div ref={printRef} className="hidden print:block">
                  <h2 className="text-lg font-bold mb-4">Productivity Schedule</h2>
                  {plan.map((day) => (
                    <div key={day.date} className="mb-6">
                      <h3 className="font-semibold text-primary mb-2">
                        {format(new Date(day.date), "EEEE, MMM d, yyyy")}
                      </h3>
                      <ul className="list-disc pl-6">
                        {day.tasks.map((t) => (
                          <li key={t.id}>
                            {t.time}: {t.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <TabsContent value="list" className="space-y-8 mt-0">
                  {plan.map((day, dayIdx) => (
                    <div key={day.date} className="space-y-4">
                      <h3 className="font-display font-semibold text-primary">
                        {format(new Date(day.date), "EEEE, MMM d")}
                      </h3>
                      <div className="space-y-3 pl-4 border-l-2 border-primary/30">
                        {day.tasks.map((t, taskIdx) => (
                          <div
                            key={t.id}
                            className="rounded-xl border-2 bg-muted/30 p-4 hover:border-primary/20 transition-colors group"
                          >
                            {editingTask?.dayIdx === dayIdx && editingTask?.taskIdx === taskIdx ? (
                              <div className="space-y-2">
                                <Input
                                  placeholder="Time (e.g. 09:00 - 10:30)"
                                  value={editValues.time}
                                  onChange={(e) =>
                                    setEditValues((v) => ({ ...v, time: e.target.value }))
                                  }
                                  className="text-sm"
                                />
                                <Input
                                  placeholder="Task title"
                                  value={editValues.title}
                                  onChange={(e) =>
                                    setEditValues((v) => ({ ...v, title: e.target.value }))
                                  }
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      updateTask(dayIdx, taskIdx, {
                                        time: editValues.time || t.time,
                                        title: editValues.title || t.title,
                                      })
                                    }
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingTask(null)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">{t.time}</span>
                                      {t.duration && (
                                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                          {t.duration}m
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="font-medium mt-1">{t.title}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                    onClick={() => {
                                      setEditingTask({ dayIdx, taskIdx });
                                      setEditValues({ time: t.time, title: t.title });
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="timeline" className="mt-0">
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/30" />
                    <div className="space-y-8">
                      {plan.map((day) => (
                        <div key={day.date} className="relative pl-12">
                          <div className="absolute left-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center -top-1">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <p className="font-display font-semibold text-primary mb-2">
                            {format(new Date(day.date), "EEEE, MMM d")}
                          </p>
                          <div className="space-y-2">
                            {day.tasks.map((t) => (
                              <div
                                key={t.id}
                                className="rounded-lg border bg-muted/30 px-4 py-2 text-sm"
                              >
                                <span className="text-muted-foreground">{t.time}</span>
                                <span className="ml-2">{t.title}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="calendar" className="mt-0">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="text-xs font-medium text-muted-foreground py-1">
                        {d}
                      </div>
                    ))}
                    {calendarDays.map((d) => {
                      const dayPlan = plan.find((p) =>
                        isSameDay(new Date(p.date), d)
                      );
                      return (
                        <div
                          key={d.toISOString()}
                          className={`min-h-[60px] rounded-lg border p-2 text-xs ${dayPlan ? "bg-primary/10 border-primary/30" : "bg-muted/20"
                            }`}
                        >
                          <span className="text-muted-foreground">
                            {format(d, "d")}
                          </span>
                          {dayPlan && (
                            <div className="mt-1 space-y-1 truncate">
                              {dayPlan.tasks.slice(0, 2).map((t) => (
                                <div key={t.id} className="truncate text-foreground">
                                  {t.title.slice(0, 15)}…
                                </div>
                              ))}
                              {dayPlan.tasks.length > 2 && (
                                <span className="text-muted-foreground">
                                  +{dayPlan.tasks.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
