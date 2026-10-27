"use client";
import { Plus, CalendarDays, Clock3, Pencil, Target } from "lucide-react";
import type { Plan, DiaryState } from "@/src/shared/domain";
import {
  formatMinutes,
  metrics,
  scopeTasks,
  priorities,
} from "@/src/shared/domain";
import { Empty } from "@/src/components/ui/Modal";
export function PlansGrid({
  state,
  onSelect,
  onAdd,
}: {
  state: DiaryState;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PLAN · 내일을 그리다</p>
          <h1>나의 계획</h1>
          <p>하고 싶은 일을, 해낼 수 있는 계획으로.</p>
        </div>
        <button className="button primary" onClick={onAdd}>
          <Plus size={17} />새 계획
        </button>
      </div>
      {state.plans.length ? (
        <div className="plans-grid">
          {state.plans.map((p, i) => {
            const m = metrics(state, scopeTasks(state, { plan: p.id }));
            const progress = m.planned
              ? Math.round((m.completed / m.planned) * 100)
              : 0;
            return (
              <button
                className="plan-card"
                key={p.id}
                onClick={() => onSelect(p.id)}
              >
                <div className="plan-card-top">
                  <span className={`plan-index color-${i % 3}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className={`priority ${p.priority}`}>
                    {priorities[p.priority]}
                  </span>
                </div>
                <h2>{p.title}</h2>
                <p className="plan-success">{p.success_criteria}</p>
                <div className="plan-date">
                  <CalendarDays size={14} />
                  {p.start_date.replaceAll("-", ".")} —{" "}
                  {p.end_date.replaceAll("-", ".")}
                </div>
                <div className="progress-label">
                  <span>
                    {m.completed} / {m.planned} 완료
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="plan-card-footer">
                  <span>
                    <Clock3 size={14} />
                    계획 예상 {formatMinutes(p.estimated_minutes)}
                  </span>
                </div>
              </button>
            );
          })}
          <button className="new-plan-card" onClick={onAdd}>
            <span>
              <Plus size={24} />
            </span>
            <strong>새로운 계획 시작하기</strong>
            <p>작은 계획 하나가 변화의 시작이에요.</p>
          </button>
        </div>
      ) : (
        <section className="surface">
          <Empty
            title="새로운 계획을 위한 빈 페이지"
            description="지금 실제로 하고 싶은 일 하나를 골라 적어 보세요."
          >
            <button className="button primary" onClick={onAdd}>
              <Plus size={17} />첫 계획 만들기
            </button>
          </Empty>
        </section>
      )}
      <div className="quiet-note">
        <Target size={19} />
        <p>
          완벽한 계획보다 <strong>돌아볼 수 있는 계획</strong>이 좋아요.
          수정해도 처음의 생각은 남아 있어요.
        </p>
      </div>
    </>
  );
}
export function PlanHeader({
  plan,
  state,
  onBack,
  onEdit,
  onHistory,
}: {
  plan: Plan;
  state: DiaryState;
  onBack: () => void;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const source = state.reviews.find((r) => r.next_plan_id === plan.id);
  return (
    <>
      <button className="back-link" onClick={onBack}>
        모든 계획
      </button>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PLAN · 계획 상세</p>
          <h1>{plan.title}</h1>
          <p>
            {plan.start_date} — {plan.end_date}{" "}
            <span className="dot-separator">·</span> 계획 예상{" "}
            {formatMinutes(plan.estimated_minutes)}
          </p>
        </div>
        <div className="button-group">
          <button className="button secondary" onClick={onHistory}>
            수정 이력
          </button>
          <button className="button primary" onClick={onEdit}>
            <Pencil size={16} />
            계획 수정
          </button>
        </div>
      </div>
      <section className="goal-strip">
        <div className="goal-icon">
          <Target size={22} />
        </div>
        <div>
          <span className="eyebrow">나의 성공 기준</span>
          <p>{plan.success_criteria}</p>
        </div>
        <span className={`priority ${plan.priority}`}>
          {priorities[plan.priority]}
        </span>
      </section>
      {source && (
        <div className="insight-note">
          <span className="eyebrow">지난 돌아보기에서 이어온 한 줄</span>
          <p>{source.improvement}</p>
        </div>
      )}
    </>
  );
}
