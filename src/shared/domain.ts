export type Priority = "high" | "medium" | "low";
export type Plan = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  priority: Priority;
  success_criteria: string;
  estimated_minutes: number;
  version: number;
  created_at: string;
  updated_at: string;
};
export type Revision = Plan & { plan_id: string; revision_id: string };
export type Task = {
  id: string;
  plan_id: string;
  title: string;
  due_date: string;
  priority: Priority;
  tags: string[];
  estimated_minutes: number;
  status: "todo" | "done";
  completion_cycle: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Execution = {
  id: string;
  task_id: string;
  started_at: string;
  ended_at: string;
  actual_minutes: number;
  blocked_reason: string;
  created_at: string;
  updated_at: string;
};
export type Timer = { task_id: string; started_at: string };
export type Review = {
  id: string;
  plan_id: string;
  from_date: string;
  to_date: string;
  improvement: string;
  next_plan_id: string | null;
  created_at: string;
  updated_at: string;
};
export type DiaryState = {
  plans: Plan[];
  revisions: Revision[];
  tasks: Task[];
  executions: Execution[];
  timers: Timer[];
  reviews: Review[];
  today: string;
};
export type Filters = {
  plan: string;
  from: string;
  to: string;
  q: string;
  status: string;
  priority: string;
  tag: string;
  sort: string;
};
export type Metric =
  | "planned"
  | "completed"
  | "delayed"
  | "blocked"
  | "estimated"
  | "actual"
  | "difference";
export const priorities: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};
export const emptyState: DiaryState = {
  plans: [],
  revisions: [],
  tasks: [],
  executions: [],
  timers: [],
  reviews: [],
  today: "",
};
export const defaultFilters: Filters = {
  plan: "",
  from: "",
  to: "",
  q: "",
  status: "",
  priority: "",
  tag: "",
  sort: "due",
};
export function seoulDate(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}
export function localDateTime(iso: string = new Date().toISOString()) {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}
export function toUTC(local: string) {
  return new Date(`${local}:00+09:00`).toISOString();
}
export function minutesBetween(start: string, end: string) {
  return Math.max(1, Math.ceil((Date.parse(end) - Date.parse(start)) / 60000));
}
export function formatMinutes(value: number) {
  const v = Math.abs(value);
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return `${value < 0 ? "−" : ""}${h ? `${h}시간` : ""}${h && m ? " " : ""}${m || !h ? `${m}분` : ""}`;
}
export function scopeTasks(state: DiaryState, filters: Partial<Filters> = {}) {
  return state.tasks.filter(
    (t) =>
      !t.deleted_at &&
      (!filters.plan || t.plan_id === filters.plan) &&
      (!filters.from || t.due_date >= filters.from) &&
      (!filters.to || t.due_date <= filters.to),
  );
}
export function isBlocked(state: DiaryState, task: Task) {
  return state.executions.some(
    (e) => e.task_id === task.id && e.blocked_reason.trim(),
  );
}
export function isDelayed(task: Task, today: string) {
  return task.status !== "done" && task.due_date < today;
}
export function metrics(state: DiaryState, tasks: Task[]) {
  const ids = new Set(tasks.map((t) => t.id));
  const estimated = tasks.reduce((n, t) => n + t.estimated_minutes, 0);
  const actual = state.executions
    .filter((e) => ids.has(e.task_id))
    .reduce((n, e) => n + e.actual_minutes, 0);
  return {
    planned: tasks.length,
    completed: tasks.filter((t) => t.status === "done").length,
    delayed: tasks.filter((t) => isDelayed(t, state.today)).length,
    blocked: tasks.filter((t) => isBlocked(state, t)).length,
    estimated,
    actual,
    difference: actual - estimated,
  };
}
export function metricTasks(state: DiaryState, tasks: Task[], metric: Metric) {
  if (metric === "completed") return tasks.filter((t) => t.status === "done");
  if (metric === "delayed")
    return tasks.filter((t) => isDelayed(t, state.today));
  if (metric === "blocked") return tasks.filter((t) => isBlocked(state, t));
  return tasks;
}
export function filterTasks(
  state: DiaryState,
  tasks: Task[],
  filters: Filters,
) {
  const rank = { high: 0, medium: 1, low: 2 };
  return tasks
    .filter(
      (t) =>
        (!filters.q ||
          `${t.title} ${t.tags.join(" ")}`
            .toLocaleLowerCase()
            .includes(filters.q.toLocaleLowerCase())) &&
        (!filters.status ||
          (filters.status === "delayed"
            ? isDelayed(t, state.today)
            : filters.status === "blocked"
              ? isBlocked(state, t)
              : t.status === filters.status)) &&
        (!filters.priority || t.priority === filters.priority) &&
        (!filters.tag || t.tags.includes(filters.tag)),
    )
    .sort(
      (a, b) =>
        (filters.sort === "priority"
          ? rank[a.priority] - rank[b.priority]
          : filters.sort === "estimate"
            ? a.estimated_minutes - b.estimated_minutes
            : filters.sort === "created"
              ? a.created_at.localeCompare(b.created_at)
              : a.due_date.localeCompare(b.due_date) ||
                rank[a.priority] - rank[b.priority]) ||
        a.created_at.localeCompare(b.created_at) ||
        a.id.localeCompare(b.id),
    );
}
