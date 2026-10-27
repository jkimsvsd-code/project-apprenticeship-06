import assert from "node:assert/strict";
const base = process.argv[2];
if (!base || !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))
  throw new Error(
    "This test only accepts a local disposable development server.",
  );
const read = async () => {
  const r = await fetch(`${base}/api/diary`);
  assert.equal(r.status, 200);
  return r.json();
};
const post = async (action, data, requestId = crypto.randomUUID()) => {
  const r = await fetch(`${base}/api/diary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data, requestId }),
  });
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  return j;
};
let state = await read();
const plan = state.plans.find((p) => p.title === "[검증] 전체 흐름");
assert.ok(plan, "Create the browser QA plan first");
const task = state.tasks.find(
  (t) => t.plan_id === plan.id && t.title.includes("__pdsXss"),
);
assert.ok(task);
await Promise.all(
  Array.from({ length: 8 }, () =>
    post("task.complete", { id: task.id, done: true }),
  ),
);
state = await read();
assert.equal(state.tasks.find((t) => t.id === task.id).status, "done");
let exported = await (await fetch(`${base}/api/export`)).json();
assert.equal(
  exported.completions.filter((e) => e.task_id === task.id).length,
  1,
);
await post("task.complete", { id: task.id, done: false });
const execution = await post("execution.save", {
  task_id: task.id,
  started_at: "2026-10-27T00:00:00.000Z",
  ended_at: "2026-10-27T00:45:00.000Z",
  actual_minutes: 45,
  blocked_reason: "[검증] 범위를 좁혀야 했음",
});
await post("execution.save", {
  id: execution.id,
  task_id: task.id,
  started_at: "2026-10-27T00:00:00.000Z",
  ended_at: "2026-10-27T00:45:00.000Z",
  actual_minutes: 45,
  blocked_reason: "[검증] 범위를 좁혀야 했음",
});
assert.equal(
  (await read()).executions.filter((e) => e.task_id === task.id).length,
  1,
);
const before = JSON.stringify(await read());
const again = JSON.stringify(await read());
assert.equal(again, before);
const forbidden = await fetch(`${base}/api/diary`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://untrusted.example",
  },
  body: "{}",
});
assert.equal(forbidden.status, 403);
const invalid = await fetch(`${base}/api/diary`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{",
});
assert.equal(invalid.status, 400);
exported = await (await fetch(`${base}/api/export`)).json();
assert.equal(
  exported.executions.find((e) => e.id === execution.id).actual_minutes,
  45,
);
assert.ok(!("commands" in exported));
console.log(
  "PASS: live D1 concurrent completion, reopening, execution correction, refresh parity, export and API boundary validation.",
);
