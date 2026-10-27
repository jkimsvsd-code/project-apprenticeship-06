"use client";
import {
  Plus,
  ArrowRight,
  Sunrise,
  Sparkles,
  CheckCircle2,
  Clock3,
  ArrowUpRight,
  Target,
} from "lucide-react";
import { Empty } from "@/src/components/ui/Modal";
import { TaskList } from "@/src/features/tasks/TaskList";
import type { TaskActions } from "@/src/features/tasks/TaskList";
import type { DiaryState } from "@/src/shared/domain";
import {
  metrics,
  scopeTasks,
  isDelayed,
  formatMinutes,
} from "@/src/shared/domain";
export default function TodayView({
  state,
  actions,
  busy,
  onAdd,
  onPlan,
  onReview,
  onPlans,
}: {
  state: DiaryState;
  actions: TaskActions;
  busy: boolean;
  onAdd: () => void;
  onPlan: () => void;
  onReview: () => void;
  onPlans: () => void;
}) {
  const all = scopeTasks(state),
    due = all.filter((t) => t.due_date === state.today),
    late = all.filter((t) => isDelayed(t, state.today)),
    running = all.filter((t) => state.timers.some((x) => x.task_id === t.id));
  const m = metrics(state, due),
    percent = m.planned ? Math.round((m.completed / m.planned) * 100) : 0;
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${state.today || "2026-01-01"}T12:00:00+09:00`));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TODAY · {date}</p>
          <h1>오늘도, 나의 속도로.</h1>
          <p>작은 실행이 모여 더 나은 내일이 됩니다.</p>
        </div>
        <button
          className="button primary"
          onClick={state.plans.length ? onAdd : onPlan}
        >
          <Plus size={17} />
          {state.plans.length ? "할 일 추가" : "첫 계획 만들기"}
        </button>
      </div>
      <section className="today-hero">
        <div className="hero-copy">
          <span className="hero-label">
            <Sunrise size={17} />
            계획과 실제 사이, 나를 알아가는 시간
          </span>
          <h2>
            계획은 가볍게,
            <br />
            기록은 솔직하게.
          </h2>
          <p>
            오늘의 한 걸음을 남기고
            <br className="mobile-break" /> 내일의 방향을 찾아보세요.
          </p>
          <button className="hero-link" onClick={onReview}>
            나의 돌아보기
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="paper paper-back" />
          <div className="paper paper-front">
            <span className="paper-title">a little progress</span>
            <div className="paper-line checked">
              <CheckCircle2 size={17} />
              <i />
            </div>
            <div className="paper-line checked">
              <CheckCircle2 size={17} />
              <i />
            </div>
            <div className="paper-line">
              <span />
              <i />
            </div>
            <div className="paper-leaf">↗</div>
          </div>
          <span className="art-spark">✦</span>
          <div className="art-caption">
            <i />
            one step at a time
          </div>
        </div>
      </section>
      <div className="today-stats">
        <div>
          <span className="stat-icon">
            <Target size={18} />
          </span>
          <span>오늘의 할 일</span>
          <strong>
            {m.planned}
            <small>개</small>
          </strong>
        </div>
        <div>
          <span className="stat-icon green">
            <CheckCircle2 size={18} />
          </span>
          <span>완료한 일</span>
          <strong>
            {m.completed}
            <small>개</small>
          </strong>
        </div>
        <div>
          <span className="stat-icon orange">
            <Clock3 size={18} />
          </span>
          <span>오늘의 예상 시간</span>
          <strong className="time-stat">{formatMinutes(m.estimated)}</strong>
        </div>
        <div className="progress-stat">
          <div
            className="ring"
            style={
              { "--progress": `${percent * 3.6}deg` } as React.CSSProperties
            }
          >
            <span>
              {percent}
              <small>%</small>
            </span>
          </div>
          <span>
            오늘의 달성률
            <br />
            <small>오늘 마감인 할 일 기준</small>
          </span>
        </div>
      </div>
      <div className="today-columns">
        <div>
          <section className="surface today-tasks">
            <div className="section-head">
              <div>
                <h2>
                  오늘의 한 걸음 <span className="count">{due.length}</span>
                  <span className="tiny-label">오늘 마감</span>
                </h2>
              </div>
              <button className="text-button" onClick={onPlans}>
                전체 보기
                <ArrowUpRight size={15} />
              </button>
            </div>
            {due.length ? (
              <TaskList
                state={state}
                tasks={due.sort(
                  (a, b) =>
                    a.status.localeCompare(b.status) ||
                    a.created_at.localeCompare(b.created_at) ||
                    a.id.localeCompare(b.id),
                )}
                actions={actions}
                busy={busy}
              />
            ) : (
              <Empty
                title="오늘의 페이지가 비어 있어요"
                description="작은 할 일 하나로 오늘을 시작해 보세요."
              >
                <button
                  className="button secondary small"
                  onClick={state.plans.length ? onAdd : onPlan}
                >
                  <Plus size={15} />
                  {state.plans.length ? "오늘 할 일 적기" : "계획부터 시작하기"}
                </button>
              </Empty>
            )}
          </section>
          {running.length > 0 && (
            <section className="surface compact-section">
              <div className="section-head">
                <h2>
                  <span className="live-dot" />
                  지금 실행 중 <span className="count">{running.length}</span>
                </h2>
              </div>
              <TaskList
                state={state}
                tasks={running}
                actions={actions}
                busy={busy}
              />
            </section>
          )}
          {late.length > 0 && (
            <section className="surface compact-section">
              <div className="section-head">
                <h2>
                  다시 이어갈 일 <span className="count">{late.length}</span>
                </h2>
                <span className="hint">기한이 지난 미완료</span>
              </div>
              <TaskList
                state={state}
                tasks={late.sort(
                  (a, b) =>
                    a.due_date.localeCompare(b.due_date) ||
                    a.id.localeCompare(b.id),
                )}
                actions={actions}
                busy={busy}
              />
            </section>
          )}
        </div>
        <aside className="reflection-card">
          <span className="reflection-icon">
            <Sparkles size={21} />
          </span>
          <p className="eyebrow">A MOMENT TO REFLECT</p>
          <h2>
            오늘의 발견은
            <br />
            내일의 힌트가 돼요.
          </h2>
          <p>
            계획한 시간과 실제로 쓴 시간,
            <br />그 사이에서 무엇을 배웠나요?
          </p>
          <div className="reflection-rule" />
          <p className="reflection-prompt">“다음에는 어떻게 해볼까?”</p>
          <button className="button secondary" onClick={onReview}>
            돌아보기 시작
            <ArrowRight size={16} />
          </button>
          <span className="small-serif">a better tomorrow starts here.</span>
        </aside>
      </div>
    </>
  );
}
