import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import {
  mutate,
  readState,
  exportData,
  AppError,
} from "../../src/server/store";
import type { Database, Statement } from "../../src/server/store";
import { metrics, scopeTasks } from "../../src/shared/domain";
class Adapter implements Database {
  sqlite = new DatabaseSync(":memory:");
  constructor() {
    this.sqlite.exec("PRAGMA foreign_keys=ON");
    for (const file of readdirSync("drizzle")
      .filter((f) => f.endsWith(".sql"))
      .sort())
      this.sqlite.exec(readFileSync(`drizzle/${file}`, "utf8"));
  }
  prepare(query: string): Statement {
    const make = (values: unknown[] = []): Statement => ({
      bind: (...next: unknown[]) => make(next),
      all: async <T>() => ({
        results: this.sqlite.prepare(query).all(...(values as never[])) as T[],
      }),
      first: async <T>() =>
        (this.sqlite.prepare(query).get(...(values as never[])) ||
          null) as T | null,
    });
    return make();
  }
  async batch(statements: Statement[]) {
    this.sqlite.exec("BEGIN IMMEDIATE");
    try {
      const out = [];
      for (const statement of statements) out.push(await statement.all());
      this.sqlite.exec("COMMIT");
      return out;
    } catch (e) {
      this.sqlite.exec("ROLLBACK");
      throw e;
    }
  }
}
const planData = {
  title: "검증용 계획",
  start_date: "2026-10-24",
  end_date: "2026-10-30",
  priority: "medium",
  success_criteria: "초안 완성",
  estimated_minutes: 1680,
};
async function send(
  db: Database,
  action: string,
  data: Record<string, unknown>,
  key = crypto.randomUUID(),
) {
  return mutate(db, { action, data, requestId: key });
}
async function setup() {
  const db = new Adapter(),
    p = await send(db, "plan.save", planData),
    t = await send(db, "task.save", {
      plan_id: p.id,
      title: "주제 탐색",
      due_date: "2026-10-24",
      priority: "high",
      tags: ["논문"],
      estimated_minutes: 180,
    });
  return { db, p, t };
}
const execution = (task_id: string, reason = "탐색 범위가 넓음") => ({
  task_id,
  started_at: "2026-10-23T22:30:00.000Z",
  ended_at: "2026-10-23T23:05:00.000Z",
  actual_minutes: 35,
  blocked_reason: reason,
});
test("migration supports immutable original and intermediate plan snapshots", async () => {
  const { db, p } = await setup();
  await send(db, "plan.save", { ...planData, id: p.id, title: "수정1" });
  await send(db, "plan.save", { ...planData, id: p.id, title: "수정2" });
  const s = await readState(db);
  assert.equal(s.plans[0].id, p.id);
  assert.deepEqual(
    s.revisions.map((r) => r.title),
    ["검증용 계획", "수정1", "수정2"],
  );
  assert.equal(s.plans[0].version, 3);
});
test("create retry restores same resource, rejects different payload on same key", async () => {
  const db = new Adapter(),
    key = crypto.randomUUID();
  const a = await send(db, "plan.save", planData, key),
    b = await send(db, "plan.save", planData, key);
  assert.equal(a.id, b.id);
  assert.equal((await readState(db)).plans.length, 1);
  await assert.rejects(
    send(db, "plan.save", { ...planData, title: "다른 요청" }, key),
    AppError,
  );
});
test("double completion with same and distinct request keys stores one event, undo and re-complete use a new cycle", async () => {
  const { db, t } = await setup();
  const key = crypto.randomUUID();
  await send(db, "task.complete", { id: t.id, done: true }, key);
  await send(db, "task.complete", { id: t.id, done: true }, key);
  await send(db, "task.complete", { id: t.id, done: true });
  let s = await readState(db);
  assert.equal(metrics(s, scopeTasks(s)).completed, 1);
  assert.equal(
    db.sqlite.prepare("SELECT COUNT(*) AS n FROM completions").get()?.n,
    1,
  );
  await send(db, "task.complete", { id: t.id, done: false });
  assert.equal(
    metrics(await readState(db), scopeTasks(await readState(db))).completed,
    0,
  );
  await send(db, "task.complete", { id: t.id, done: true });
  assert.equal(
    db.sqlite.prepare("SELECT COUNT(*) AS n FROM completions").get()?.n,
    2,
  );
  s = await readState(db);
  assert.equal(metrics(s, scopeTasks(s)).completed, 1);
});
test("multiple blocked executions count one task and actual sum preserves plan estimate", async () => {
  const { db, t } = await setup();
  await send(db, "execution.save", execution(t.id));
  await send(db, "execution.save", execution(t.id));
  const s = await readState(db),
    m = metrics(s, scopeTasks(s));
  assert.equal(m.blocked, 1);
  assert.equal(m.actual, 70);
  assert.equal(m.estimated, 180);
  assert.equal(m.difference, -110);
  assert.equal(s.plans[0].estimated_minutes, 1680);
});
test("delete removes task and execution time from scope; restore recovers both; export retains deleted data", async () => {
  const { db, t } = await setup();
  await send(db, "execution.save", execution(t.id));
  await send(db, "task.delete", { id: t.id });
  let s = await readState(db);
  assert.equal(metrics(s, scopeTasks(s)).actual, 0);
  const exported = await exportData(db);
  assert.equal(exported.tasks.length, 1);
  assert.equal(exported.executions.length, 1);
  assert.ok(exported.tasks[0].deleted_at);
  assert.equal("commands" in exported, false);
  await send(db, "task.restore", { id: t.id });
  s = await readState(db);
  assert.equal(metrics(s, scopeTasks(s)).actual, 35);
});
test("invalid dates, negative durations and reversed timestamps do not mutate DB", async () => {
  const { db, p, t } = await setup();
  await assert.rejects(
    send(db, "plan.save", { ...planData, id: p.id, start_date: "2026-02-30" }),
    AppError,
  );
  await assert.rejects(
    send(db, "plan.save", { ...planData, id: p.id, end_date: "2026-10-01" }),
    AppError,
  );
  await assert.rejects(
    send(db, "execution.save", { ...execution(t.id), actual_minutes: -1 }),
    AppError,
  );
  await assert.rejects(
    send(db, "execution.save", {
      ...execution(t.id),
      ended_at: "2026-10-22T01:00:00Z",
    }),
    AppError,
  );
  const s = await readState(db);
  assert.equal(s.executions.length, 0);
  assert.equal(s.plans[0].version, 1);
});
test("timer persists independently, retry start keeps original start, stop creates one execution", async () => {
  const { db, t } = await setup();
  await send(db, "timer.start", { task_id: t.id });
  const start = (await readState(db)).timers[0].started_at;
  await send(db, "timer.start", { task_id: t.id });
  assert.equal((await readState(db)).timers[0].started_at, start);
  const key = crypto.randomUUID();
  await send(db, "timer.stop", { task_id: t.id }, key);
  await send(db, "timer.stop", { task_id: t.id }, key);
  const s = await readState(db);
  assert.equal(s.timers.length, 0);
  assert.equal(s.executions.length, 1);
  assert.equal(s.executions[0].actual_minutes, 1);
});
test("review improvement links once and copies tasks without completions or executions", async () => {
  const { db, p, t } = await setup();
  await send(db, "execution.save", execution(t.id));
  await send(db, "task.complete", { id: t.id, done: true });
  const r = await send(db, "review.save", {
    plan_id: p.id,
    from_date: "2026-10-24",
    to_date: "2026-10-30",
    improvement: "범위를 줄이기",
  });
  const next = {
    ...planData,
    title: "다음 계획",
    review_id: r.id,
    task_ids: [t.id],
  };
  const a = await send(db, "review.next", next),
    b = await send(db, "review.next", next);
  assert.equal(a.id, b.id);
  const s = await readState(db);
  assert.equal(s.plans.length, 2);
  assert.equal(s.reviews[0].next_plan_id, a.id);
  assert.equal(s.reviews[0].improvement, "범위를 줄이기");
  const copied = s.tasks.find((t) => t.plan_id === a.id)!;
  assert.equal(copied.status, "todo");
  assert.equal(copied.completion_cycle, 0);
  assert.equal(s.executions.filter((e) => e.task_id === copied.id).length, 0);
  assert.equal(copied.due_date, planData.end_date);
});
test("SQL-looking and script-looking strings remain literal data", async () => {
  const { db, p } = await setup();
  const title = "<script>window.__xss=1</script>";
  await send(db, "plan.save", {
    ...planData,
    id: p.id,
    title,
    success_criteria: "'); DROP TABLE plans; --",
  });
  const s = await readState(db);
  assert.equal(s.plans[0].title, title);
  assert.equal(s.plans.length, 1);
});
test("foreign key and CHECK constraints reject direct inconsistent writes", () => {
  const db = new Adapter();
  assert.throws(() =>
    db.sqlite.exec(
      "INSERT INTO timers VALUES ('missing','2026-10-27T00:00:00Z')",
    ),
  );
});

test("export reads all related tables in one atomic batch", async () => {
  const { db } = await setup();
  let batches = 0;
  const original = db.batch.bind(db);
  db.batch = async (statements) => {
    batches++;
    assert.equal(statements.length, 7);
    return original(statements);
  };
  await exportData(db);
  assert.equal(batches, 1);
});
