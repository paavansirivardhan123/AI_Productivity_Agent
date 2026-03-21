export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  subscriptionType: "free" | "premium";
  createdAt?: string;
}

export interface SchedulePlan {
  id: string;
  userId: string;
  title: string;
  goal: string;
  startDate: string;
  endDate: string;
  dailyPlans: DailyPlan[];
  calendarSyncStatus?: "synced" | "pending" | "none";
}

export interface DailyPlan {
  date: string;
  tasks: TaskItem[];
}

export interface TaskItem {
  id: string;
  title: string;
  timeSlot: string;
  duration: number;
  notes?: string;
}
