"use client";
import { useState } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { Modal, FormError } from "@/src/components/ui/Modal";
import { localDateTime, toUTC, minutesBetween } from "@/src/shared/domain";
import type { Task, Execution } from "@/src/shared/domain";
import type { RunAction } from "@/src/shared/client";
export default function ExecutionForm({
  task,
  execution,
  run,
  onClose,
}: {
  task: Task;
  execution?: Execution;
  run: RunAction;
  onClose: () => void;
}) {
  const [start, setStart] = useState(
      localDateTime(
        execution?.started_at ||
          new Date(Date.now() - 30 * 60000).toISOString(),
      ),
    ),
    [end, setEnd] = useState(localDateTime(execution?.ended_at));
  const [minutes, setMinutes] = useState(execution?.actual_minutes || 30),
    [manual, setManual] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<{ message: string; field?: string } | null>(
      null,
    );
  function updateTime(s: string, e: string) {
    setStart(s);
    setEnd(e);
    if (s && e && !manual && new Date(toUTC(e)) >= new Date(toUTC(s)))
      setMinutes(minutesBetween(toUTC(s), toUTC(e)));
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (end < start) {
      setError({
        message: "종료 시각은 시작 시각 이후여야 합니다.",
        field: "ended_at",
      });
      return;
    }
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await run("execution.save", {
        ...(execution ? { id: execution.id } : {}),
        task_id: task.id,
        started_at:
          execution && start === localDateTime(execution.started_at)
            ? execution.started_at
            : toUTC(start),
        ended_at:
          execution && end === localDateTime(execution.ended_at)
            ? execution.ended_at
            : toUTC(end),
        actual_minutes: minutes,
        blocked_reason: fd.get("blocked_reason"),
      });
      onClose();
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={execution ? "실행 기록 수정" : "실제로 한 일 남기기"}
      subtitle={task.title}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <p className="hint">
            서울 시간 기준입니다. 실행 기록은 원래 계획의 예상 시간을 바꾸지
            않습니다.
          </p>
          <label>
            시작 시각
            <input
              autoFocus
              name="started_at"
              type="datetime-local"
              required
              value={start}
              onChange={(e) => updateTime(e.target.value, end)}
            />
          </label>
          <label>
            종료 시각
            <input
              name="ended_at"
              type="datetime-local"
              required
              value={end}
              onChange={(e) => updateTime(start, e.target.value)}
              aria-invalid={error?.field === "ended_at"}
            />
          </label>
          <label>
            실제로 걸린 시간 <span className="label-unit">분</span>
            <input
              name="actual_minutes"
              type="number"
              required
              min={1}
              max={1000000}
              value={minutes}
              onChange={(e) => {
                setManual(true);
                setMinutes(Number(e.target.value));
              }}
            />
            <small>
              시각으로 자동 계산하며, 쉬는 시간 등을 반영해 직접 수정할 수
              있어요.
            </small>
          </label>
          <label>
            막혔던 이유 <span className="label-unit">선택</span>
            <textarea
              name="blocked_reason"
              maxLength={2000}
              rows={3}
              defaultValue={execution?.blocked_reason || ""}
              placeholder="어디에서 시간이 더 필요했나요? 없으면 비워 두세요."
            />
          </label>
          <FormError error={error} />
          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              취소
            </button>
            <button type="submit" className="button primary">
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <Check size={17} />
              )}{" "}
              {busy ? "저장 중…" : "기록 저장"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
