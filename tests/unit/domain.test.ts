import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seoulDate,
  metrics,
  scopeTasks,
  filterTasks,
  metricTasks,
  emptyState,
  defaultFilters,
  localDateTime,
  toUTC,
  minutesBetween,
} from "../../src/shared/domain";
import type { DiaryState, Task } from "../../src/shared/domain";
function task(id: string, props: Partial<Task> = {}): Task {
  return {
    id,
    plan_id: "p",
    title: "할 일",
    due_date: "2026-10-27",
    priority: "medium",
    tags: [],
    estimated_minutes: 30,
    status: "todo",
    completion_cycle: 0,
    deleted_at: null,
    created_at: "2026-10-24T00:00:00Z",
    updated_at: "2026-10-24T00:00:00Z",
    ...props,
  };
}
test("Seoul midnight boundary is independent of server timezone", () => {
  assert.equal(seoulDate(new Date("2026-10-26T14:59:59Z")), "2026-10-26");
  assert.equal(seoulDate(new Date("2026-10-26T15:00:00Z")), "2026-10-27");
  assert.equal(
    toUTC(localDateTime("2026-10-24T22:30:00Z")),
    "2026-10-24T22:30:00.000Z",
  );
});
test("empty aggregate is all zeros", () => {
  assert.deepEqual(metrics({ ...emptyState, today: "2026-10-27" }, []), {
    planned: 0,
    completed: 0,
    delayed: 0,
    blocked: 0,
    estimated: 0,
    actual: 0,
    difference: 0,
  });
});
test("today is not late, completed and deleted are not late", () => {
  const state: DiaryState = {
    ...emptyState,
    today: "2026-10-27",
    tasks: [
      task("today"),
      task("late", { due_date: "2026-10-26" }),
      task("done", { due_date: "2026-10-25", status: "done" }),
      task("deleted", { due_date: "2026-10-25", deleted_at: "now" }),
    ],
  };
  const m = metrics(state, scopeTasks(state));
  assert.equal(m.planned, 3);
  assert.equal(m.completed, 1);
  assert.equal(m.delayed, 1);
  assert.deepEqual(
    metricTasks(state, scopeTasks(state), "delayed").map((t) => t.id),
    ["late"],
  );
});
test("period uses due date, stable sorting ends with unique ID", () => {
  const state: DiaryState = {
    ...emptyState,
    today: "2026-10-27",
    tasks: [task("b"), task("a"), task("c", { due_date: "2026-10-30" })],
  };
  const scoped = scopeTasks(state, { from: "2026-10-27", to: "2026-10-27" });
  assert.equal(scoped.length, 2);
  assert.deepEqual(
    filterTasks(state, scoped, defaultFilters).map((t) => t.id),
    ["a", "b"],
  );
});
test("search, tags, priority and completion filters combine", () => {
  const state: DiaryState = {
    ...emptyState,
    tasks: [
      task("a", { title: "논문 작성", tags: ["연구"], priority: "high" }),
      task("b", { title: "논문", status: "done" }),
    ],
  };
  assert.deepEqual(
    filterTasks(state, state.tasks, {
      ...defaultFilters,
      q: "논문",
      tag: "연구",
      priority: "high",
      status: "todo",
    }).map((t) => t.id),
    ["a"],
  );
});
test("timer rounds up to a minute without changing manually entered duration", () => {
  assert.equal(
    minutesBetween("2026-10-24T00:00:00Z", "2026-10-24T00:00:01Z"),
    1,
  );
  assert.equal(
    minutesBetween("2026-10-24T00:00:00Z", "2026-10-24T00:01:01Z"),
    2,
  );
});
