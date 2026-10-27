"use client";
import {
  Check,
  Play,
  Square,
  Pencil,
  Trash2,
  Clock3,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import {
  formatMinutes,
  filterTasks,
  isDelayed,
  priorities,
} from "@/src/shared/domain";
import type { DiaryState, Task, Filters, Execution } from "@/src/shared/domain";
import { Empty } from "@/src/components/ui/Modal";
export type TaskActions = {
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onTimer: (task: Task, stop: boolean) => void;
  onRecord: (task: Task, execution?: Execution) => void;
  onDetail: (task: Task) => void;
};
export function TaskList({
  state,
  tasks,
  actions,
  busy = false,
  showPlan = true,
}: {
  state: DiaryState;
  tasks: Task[];
  actions: TaskActions;
  busy?: boolean;
  showPlan?: boolean;
}) {
  return (
    <div className="task-list">
      {tasks.map((task) => {
        const plan = state.plans.find((p) => p.id === task.plan_id),
          timer = state.timers.find((t) => t.task_id === task.id),
          actual = state.executions
            .filter((e) => e.task_id === task.id)
            .reduce((n, e) => n + e.actual_minutes, 0),
          late = isDelayed(task, state.today);
        return (
          <article
            className={`task-row ${task.status === "done" ? "is-done" : ""}`}
            key={task.id}
          >
            <button
              className="task-check"
              aria-label={`${task.title} ${task.status === "done" ? "완료 취소" : "완료"}`}
              aria-pressed={task.status === "done"}
              disabled={busy}
              onClick={() => actions.onComplete(task)}
            >
              {task.status === "done" && <Check size={15} />}
            </button>
            <div className="task-main">
              <button
                className="task-title"
                onClick={() => actions.onDetail(task)}
              >
                {task.title}
              </button>
              <div className="task-meta">
                {showPlan && <span>{plan?.title}</span>}
                <span className={late ? "overdue" : ""}>
                  {late ? "지연 · " : ""}
                  {task.due_date === state.today
                    ? "오늘"
                    : task.due_date.slice(5).replace("-", ".")}{" "}
                  마감
                </span>
                {task.tags.map((t) => (
                  <span className="tag" key={t}>
                    #{t}
                  </span>
                ))}
                {timer && (
                  <span className="running-label">
                    <i />
                    실행 중
                  </span>
                )}
              </div>
            </div>
            <span className={`priority ${task.priority}`}>
              {priorities[task.priority]}
            </span>
            <div className="task-time">
              <span>
                <Clock3 size={13} />
                {formatMinutes(task.estimated_minutes)}
              </span>
              {actual > 0 && <small>실제 {formatMinutes(actual)}</small>}
            </div>
            <div className="task-tools">
              <button
                title={timer ? "타이머 종료·기록 저장" : "타이머 시작"}
                aria-label={`${task.title} ${timer ? "타이머 종료" : "타이머 시작"}`}
                className={`icon-button ${timer ? "teal" : ""}`}
                disabled={busy}
                onClick={() => actions.onTimer(task, !!timer)}
              >
                {timer ? <Square size={15} /> : <Play size={16} />}
              </button>
              <details className="task-menu">
                <summary
                  className="icon-button"
                  aria-label={`${task.title} 더 보기`}
                >
                  <MoreHorizontal size={19} />
                </summary>
                <div
                  className="menu-panel"
                  onClick={(event) =>
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open")
                  }
                >
                  <button
                    disabled={busy}
                    onClick={() => actions.onRecord(task)}
                  >
                    <Plus size={15} />
                    실행 기록
                  </button>
                  <button disabled={busy} onClick={() => actions.onEdit(task)}>
                    <Pencil size={15} />
                    수정
                  </button>
                  <button
                    disabled={busy}
                    className="danger-text"
                    onClick={() => actions.onDelete(task)}
                  >
                    <Trash2 size={15} />
                    삭제
                  </button>
                </div>
              </details>
            </div>
          </article>
        );
      })}
    </div>
  );
}
export function TaskExplorer({
  state,
  tasks,
  filters,
  onFilters,
  actions,
  busy,
  onAdd,
}: {
  state: DiaryState;
  tasks: Task[];
  filters: Filters;
  onFilters: (patch: Partial<Filters>) => void;
  actions: TaskActions;
  busy: boolean;
  onAdd: () => void;
}) {
  const shown = filterTasks(state, tasks, filters),
    tags = [...new Set(tasks.flatMap((t) => t.tags))].sort();
  return (
    <section className="surface explorer">
      <div className="section-head">
        <div>
          <h2>
            할 일 <span className="count">{shown.length}</span>
          </h2>
          <p className="hint">작게 나누고, 하나씩 해내요.</p>
        </div>
        <button
          className="button secondary small"
          onClick={onAdd}
          disabled={busy}
        >
          <Plus size={16} />할 일 추가
        </button>
      </div>
      <div className="task-filters">
        <div className="search">
          <Search size={17} />
          <input
            aria-label="할 일 검색"
            type="search"
            placeholder="할 일과 태그 검색"
            value={filters.q}
            onChange={(e) => onFilters({ q: e.target.value })}
          />
        </div>
        <select
          aria-label="상태 필터"
          value={filters.status}
          onChange={(e) => onFilters({ status: e.target.value })}
        >
          <option value="">모든 상태</option>
          <option value="todo">미완료</option>
          <option value="done">완료</option>
          <option value="delayed">지연</option>
          <option value="blocked">막힘</option>
        </select>
        <select
          aria-label="우선순위 필터"
          value={filters.priority}
          onChange={(e) => onFilters({ priority: e.target.value })}
        >
          <option value="">모든 우선순위</option>
          {Object.entries(priorities).map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="태그 필터"
          value={filters.tag}
          onChange={(e) => onFilters({ tag: e.target.value })}
        >
          <option value="">모든 태그</option>
          {tags.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select
          aria-label="정렬"
          value={filters.sort}
          onChange={(e) => onFilters({ sort: e.target.value })}
        >
          <option value="due">마감일순</option>
          <option value="priority">우선순위순</option>
          <option value="estimate">예상 시간순</option>
          <option value="created">등록순</option>
        </select>
      </div>
      <p className="sort-note">
        <SlidersHorizontal size={12} />{" "}
        {filters.sort === "due"
          ? "마감일, 우선순위 순"
          : filters.sort === "priority"
            ? "높은 우선순위부터"
            : filters.sort === "estimate"
              ? "예상 시간이 짧은 순"
              : "먼저 등록한 순"}{" "}
        · 같은 값은 등록 시각, ID 순{" "}
        <button
          className="text-button"
          onClick={() =>
            onFilters({ q: "", status: "", priority: "", tag: "", sort: "due" })
          }
        >
          초기화
        </button>
      </p>
      {shown.length ? (
        <TaskList state={state} tasks={shown} actions={actions} busy={busy} />
      ) : (
        <Empty
          title={
            tasks.length
              ? "조건에 맞는 할 일이 없어요"
              : "첫 번째 할 일을 적어 볼까요?"
          }
          description={
            tasks.length
              ? "검색어나 필터를 바꾸면 다른 할 일을 볼 수 있어요."
              : "해야 할 일을 작은 행동으로 나누면 시작이 가벼워져요."
          }
        >
          {!tasks.length && (
            <button className="button secondary" onClick={onAdd}>
              할 일 추가
            </button>
          )}
        </Empty>
      )}
    </section>
  );
}
