"use client";
import { useState } from "react";
import { Plus, LoaderCircle, Check } from "lucide-react";
import { Modal, FormError } from "@/src/components/ui/Modal";
import { priorities, seoulDate } from "@/src/shared/domain";
import type { Task, Plan } from "@/src/shared/domain";
import type { RunAction } from "@/src/shared/client";
export default function TaskForm({
  task,
  plans,
  planId,
  run,
  onClose,
}: {
  task?: Task;
  plans: Plan[];
  planId?: string;
  run: RunAction;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<{ message: string; field?: string } | null>(
      null,
    ),
    [more, setMore] = useState(!task),
    [added, setAdded] = useState(0);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      fd = new FormData(form);
    setError(null);
    setBusy(true);
    const data: Record<string, unknown> = {
      plan_id: fd.get("plan_id"),
      title: fd.get("title"),
      due_date: fd.get("due_date"),
      priority: fd.get("priority"),
      estimated_minutes: Number(fd.get("estimated_minutes")),
      tags: String(fd.get("tags"))
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (task) data.id = task.id;
    try {
      await run("task.save", data);
      if (more && !task) {
        setAdded((n) => n + 1);
        (form.elements.namedItem("title") as HTMLInputElement).value = "";
        setTimeout(
          () => (form.elements.namedItem("title") as HTMLInputElement)?.focus(),
          0,
        );
      } else onClose();
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={task ? "할 일 수정" : "작은 한 걸음 추가"}
      subtitle="실행할 수 있는 크기로 할 일을 나눠 보세요."
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {added > 0 && (
            <p className="success-inline" role="status">
              <Check size={16} />
              {added}개 저장했어요. 다음 할 일을 이어서 적어 주세요.
            </p>
          )}
          <label>
            연결할 계획
            <select
              name="plan_id"
              required
              defaultValue={task?.plan_id || planId || plans[0]?.id}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            할 일
            <input
              autoFocus
              name="title"
              maxLength={200}
              required
              defaultValue={task?.title}
              placeholder="지금 시작할 수 있는 구체적인 행동"
            />
          </label>
          <div className="form-grid">
            <label>
              마감일
              <input
                name="due_date"
                type="date"
                required
                defaultValue={task?.due_date || seoulDate()}
              />
            </label>
            <label>
              우선순위
              <select name="priority" defaultValue={task?.priority || "medium"}>
                {Object.entries(priorities).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label>
              예상 시간 <span className="label-unit">분</span>
              <input
                name="estimated_minutes"
                type="number"
                min={0}
                max={1000000}
                required
                defaultValue={task?.estimated_minutes ?? 30}
              />
            </label>
            <label>
              태그
              <input
                name="tags"
                defaultValue={task?.tags.join(", ")}
                placeholder="공부, 프로젝트"
                maxLength={310}
              />
              <small>쉼표로 구분 · 최대 10개</small>
            </label>
          </div>
          {!task && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={more}
                onChange={(e) => setMore(e.target.checked)}
              />
              저장 후 계속 추가하기{" "}
              <span className="muted">계획·우선순위·태그 유지</span>
            </label>
          )}
          <FormError error={error} />
          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              {added ? "닫기" : "취소"}
            </button>
            <button type="submit" className="button primary">
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <Plus size={17} />
              )}{" "}
              {busy ? "저장 중…" : "할 일 저장"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
