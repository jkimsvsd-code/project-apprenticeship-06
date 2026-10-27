"use client";
import { Plus, Pencil, Play, Square, Clock3, Check } from "lucide-react";
import { Modal, Empty } from "@/src/components/ui/Modal";
import { formatMinutes, priorities } from "@/src/shared/domain";
import type { DiaryState, Task } from "@/src/shared/domain";
import type { TaskActions } from "./TaskList";
export default function TaskDetail({
  task,
  state,
  actions,
  onClose,
  busy,
  now,
}: {
  task: Task;
  state: DiaryState;
  actions: TaskActions;
  onClose: () => void;
  busy: boolean;
  now: number;
}) {
  const executions = state.executions.filter((e) => e.task_id === task.id),
    timer = state.timers.find((t) => t.task_id === task.id),
    elapsed = timer
      ? Math.max(0, Math.floor((now - Date.parse(timer.started_at)) / 1000))
      : 0;
  const time = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  return (
    <Modal
      title={task.title}
      subtitle={state.plans.find((p) => p.id === task.plan_id)?.title}
      onClose={onClose}
      busy={busy}
      wide
    >
      <div className="detail-overview">
        <span className={`priority ${task.priority}`}>
          우선순위 {priorities[task.priority]}
        </span>
        <span>{task.due_date} 마감</span>
        <span>예상 {formatMinutes(task.estimated_minutes)}</span>
        <span>
          실제{" "}
          {formatMinutes(executions.reduce((n, e) => n + e.actual_minutes, 0))}
        </span>
      </div>
      <div className="detail-tags">
        {task.tags.map((t) => (
          <span className="tag" key={t}>
            #{t}
          </span>
        ))}
      </div>
      {timer && (
        <div className="timer-banner" role="status">
          <span className="live-dot" />
          <strong>
            {String(Math.floor(elapsed / 3600)).padStart(2, "0")}:
            {String(Math.floor(elapsed / 60) % 60).padStart(2, "0")}:
            {String(elapsed % 60).padStart(2, "0")}
          </strong>
          <span>{time(timer.started_at)} 시작 · 새로고침해도 유지돼요</span>
        </div>
      )}
      <div className="detail-buttons">
        <button
          className="button primary"
          onClick={() => actions.onTimer(task, !!timer)}
          disabled={busy}
        >
          {timer ? <Square size={15} /> : <Play size={15} />}{" "}
          {timer ? "타이머 종료·저장" : "타이머 시작"}
        </button>
        <button
          className="button secondary"
          onClick={() => actions.onRecord(task)}
          disabled={busy}
        >
          <Plus size={16} />
          직접 기록
        </button>
        <button
          className="button secondary"
          onClick={() => actions.onComplete(task)}
          disabled={busy}
        >
          <Check size={16} />
          {task.status === "done" ? "완료 취소" : "할 일 완료"}
        </button>
      </div>
      <div className="section-head">
        <h3>
          실행 기록 <span className="count">{executions.length}</span>
        </h3>
        <span className="hint">서울 시간 · 분 단위</span>
      </div>
      {executions.length ? (
        <div className="execution-list">
          {executions.map((e) => (
            <article key={e.id}>
              <div className="execution-head">
                <span>
                  <Clock3 size={15} />
                  {time(e.started_at)} → {time(e.ended_at)}
                </span>
                <button
                  className="icon-button"
                  aria-label="실행 기록 수정"
                  onClick={() => actions.onRecord(task, e)}
                  disabled={busy}
                >
                  <Pencil size={15} />
                </button>
              </div>
              <strong>{formatMinutes(e.actual_minutes)}</strong>
              <p className={e.blocked_reason ? "blocked-note" : "hint"}>
                {e.blocked_reason
                  ? `막혔던 이유 · ${e.blocked_reason}`
                  : "막힌 이유 없음"}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <Empty
          title="첫 실행을 기록해 볼까요?"
          description="타이머로 시작하거나 이미 한 일을 직접 남길 수 있어요."
        />
      )}
    </Modal>
  );
}
