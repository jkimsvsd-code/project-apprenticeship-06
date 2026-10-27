"use client";
import { useState } from "react";
import {
  Check,
  Sparkles,
  BarChart3,
  Share2,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  metrics,
  scopeTasks,
  metricTasks,
  formatMinutes,
} from "@/src/shared/domain";
import type { DiaryState, Filters, Metric, Review } from "@/src/shared/domain";
import type { RunAction } from "@/src/shared/client";
import { FormError, Empty } from "@/src/components/ui/Modal";
import { TaskList } from "@/src/features/tasks/TaskList";
import type { TaskActions } from "@/src/features/tasks/TaskList";
export default function ReviewView({
  state,
  filters,
  onFilters,
  metric,
  onMetric,
  actions,
  run,
  busy,
  onNext,
  onOpenPlan,
  onShare,
}: {
  state: DiaryState;
  filters: Filters;
  onFilters: (p: Partial<Filters>) => void;
  metric: string;
  onMetric: (m: string) => void;
  actions: TaskActions;
  run: RunAction;
  busy: boolean;
  onNext: (review: Review) => void;
  onOpenPlan: (id: string) => void;
  onShare: () => void;
}) {
  const plan = state.plans.find((p) => p.id === filters.plan),
    from = filters.from || plan?.start_date || "",
    to = filters.to || plan?.end_date || "";
  const invalid = !!from && !!to && from > to;
  const tasks = invalid
      ? []
      : scopeTasks(state, { plan: filters.plan, from, to }),
    m = metrics(state, tasks),
    selected = metricTasks(state, tasks, metric as Metric);
  const [error, setError] = useState<{
      message: string;
      field?: string;
    } | null>(null),
    [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const labels: Record<Metric, string> = {
    planned: "계획 수",
    completed: "완료",
    delayed: "지연",
    blocked: "막힘",
    estimated: "예상 시간",
    actual: "실제 시간",
    difference: "시간 차이",
  };
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!plan) {
      setError({ message: "돌아볼 계획을 먼저 선택해 주세요." });
      return;
    }
    if (invalid) {
      setError({ message: "종료일은 시작일 이후여야 합니다." });
      return;
    }
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await run("review.save", {
        plan_id: plan.id,
        from_date: from,
        to_date: to,
        improvement: fd.get("improvement"),
      });
      setSaved(
        "개선점을 저장했어요. 아래 기록에서 다음 계획으로 이어갈 수 있어요.",
      );
      (e.target as HTMLFormElement).reset();
    } catch (e) {
      setError(e as Error);
    } finally {
      setSaving(false);
    }
  }
  const savedReviews = state.reviews.filter(
    (r) => !filters.plan || r.plan_id === filters.plan,
  );
  const max = Math.max(1, m.estimated, m.actual);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SEE · 다음을 위한 발견</p>
          <h1>나의 돌아보기</h1>
          <p>숫자 뒤의 기록을 살피고, 다음 한 걸음을 찾아요.</p>
        </div>
        <button className="button secondary" onClick={onShare}>
          <Share2 size={16} />
          조회 주소 복사
        </button>
      </div>
      <section className="surface review-filters">
        <label>
          돌아볼 계획
          <select
            value={filters.plan}
            onChange={(e) => {
              onFilters({ plan: e.target.value, from: "", to: "" });
              setSaved("");
            }}
          >
            <option value="">모든 계획</option>
            {state.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          시작일
          <input
            aria-label="돌아보기 시작일"
            type="date"
            value={from}
            onChange={(e) => onFilters({ from: e.target.value })}
          />
        </label>
        <span className="range-dash">—</span>
        <label>
          종료일
          <input
            aria-label="돌아보기 종료일"
            type="date"
            value={to}
            onChange={(e) => onFilters({ to: e.target.value })}
          />
        </label>
      </section>
      {invalid && (
        <p className="form-error" role="alert">
          종료일은 시작일 이후여야 합니다.
        </p>
      )}
      <p className="scope-note">
        할 일의 마감일 기준 · 삭제 제외 · 시간은 대상 할 일의 모든 실행 기록
        합계 · 숫자를 누르면 근거 기록으로 이동합니다.
      </p>
      <div className="metric-grid">
        {(["planned", "completed", "delayed", "blocked"] as Metric[]).map(
          (k) => (
            <button
              className={`metric-card ${metric === k ? "selected" : ""}`}
              key={k}
              onClick={() => onMetric(k)}
            >
              <span>
                {labels[k]}
                {k === "planned" && <small>할 일 기준</small>}
              </span>
              <strong>
                {m[k]}
                <small>개</small>
              </strong>
              <div className="metric-foot">
                {k === "planned"
                  ? "삭제되지 않은 할 일"
                  : k === "completed"
                    ? "지금 완료 상태인 할 일"
                    : k === "delayed"
                      ? "오늘 전 마감 · 미완료"
                      : "막힌 이유가 있는 할 일"}
              </div>
            </button>
          ),
        )}
      </div>
      <div className="review-columns">
        <section className="surface time-chart">
          <div className="section-head">
            <div>
              <h2>계획과 실제의 간격</h2>
              <p className="hint">차이를 알아야, 다음이 달라져요.</p>
            </div>
            <span className="soft-icon">
              <BarChart3 size={20} />
            </span>
          </div>
          <div
            className="bar-chart"
            role="group"
            aria-label="예상 시간과 실제 시간 비교"
          >
            {(["estimated", "actual"] as const).map((k) => (
              <button key={k} className="chart-row" onClick={() => onMetric(k)}>
                <span>{labels[k]}</span>
                <div className="chart-track">
                  <i
                    className={k}
                    style={{ width: `${(m[k] / max) * 100}%` }}
                  />
                </div>
                <strong>{formatMinutes(m[k])}</strong>
              </button>
            ))}
          </div>
          <button
            className="time-difference"
            onClick={() => onMetric("difference")}
          >
            <span>실제 − 예상</span>
            <strong>
              {m.difference > 0 ? "+" : ""}
              {formatMinutes(m.difference)}
            </strong>
          </button>
          <p className="hint">
            계획 자체의 예상 시간이 아닌, 대상 할 일의 예상 시간 합계와
            비교합니다.
          </p>
        </section>
        <section className="insight-card">
          <Sparkles size={22} />
          <p className="eyebrow">ONE SMALL CHANGE</p>
          <h2>다음에는 어떻게 해볼까요?</h2>
          <p>
            시간이 더 필요했던 이유나 계속하고 싶은 습관,
            <br />
            다음 계획에 이어갈 한 가지만 적어 주세요.
          </p>
          <form onSubmit={save}>
            <fieldset disabled={saving || busy || !plan || invalid}>
              <label className="sr-only" htmlFor="improvement">
                다음 계획에 이어갈 개선점
              </label>
              <textarea
                id="improvement"
                name="improvement"
                rows={3}
                maxLength={1000}
                required
                placeholder={
                  plan
                    ? "예: 어려운 작업은 30분 단위로 나누고 여유 시간을 더하기"
                    : "위에서 돌아볼 계획을 선택해 주세요."
                }
              />
              <button className="button primary" type="submit">
                {saving ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <Check size={16} />
                )}
                개선점 저장
              </button>
            </fieldset>
            <FormError error={error} />
            {saved && (
              <p className="success-inline" role="status">
                {saved}
              </p>
            )}
          </form>
        </section>
      </div>
      {metric && metric in labels && (
        <section
          className="surface evidence-list"
          id="metric-evidence"
          tabIndex={-1}
        >
          <div className="section-head">
            <div>
              <p className="eyebrow">숫자의 근거</p>
              <h2>
                {labels[metric as Metric]}{" "}
                <span className="count">
                  {["estimated", "actual", "difference"].includes(metric)
                    ? formatMinutes(m[metric as Metric])
                    : `${m[metric as Metric]}개`}
                </span>
              </h2>
              <p className="hint">
                할 일을 누르면 연결된 실행 시각·소요 시간·막힌 이유를 확인할 수
                있어요.
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="근거 목록 닫기"
              onClick={() => onMetric("")}
            >
              <X size={18} />
            </button>
          </div>
          {selected.length ? (
            <>
              <TaskList
                state={state}
                tasks={selected}
                actions={actions}
                busy={busy}
              />
              {["estimated", "actual", "difference"].includes(metric) && (
                <div className="contribution-table">
                  <table>
                    <caption>할 일별 시간 집계 근거 · 분 단위</caption>
                    <thead>
                      <tr>
                        <th>할 일</th>
                        <th>예상</th>
                        <th>실제</th>
                        <th>차이</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.map((t) => {
                        const sum = state.executions
                          .filter((e) => e.task_id === t.id)
                          .reduce((n, e) => n + e.actual_minutes, 0);
                        return (
                          <tr key={t.id}>
                            <th>
                              <button
                                className="text-button"
                                onClick={() => actions.onDetail(t)}
                              >
                                {t.title}
                              </button>
                            </th>
                            <td>{t.estimated_minutes}</td>
                            <td>{sum}</td>
                            <td>{sum - t.estimated_minutes}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <Empty
              title="집계에 포함된 기록이 없어요"
              description="대상 기록이 없으면 수량과 시간은 0으로 표시됩니다."
            />
          )}
        </section>
      )}
      <section className="surface review-history">
        <div className="section-head">
          <div>
            <h2>
              다음으로 이어지는 기록{" "}
              <span className="count">{savedReviews.length}</span>
            </h2>
            <p className="hint">저장한 개선점은 다음 계획에 연결해 보세요.</p>
          </div>
        </div>
        {savedReviews.length ? (
          <div>
            {savedReviews.map((r) => (
              <article className="saved-review" key={r.id}>
                <div>
                  <span className="eyebrow">
                    {state.plans.find((p) => p.id === r.plan_id)?.title} ·{" "}
                    {r.from_date} — {r.to_date}
                  </span>
                  <p>{r.improvement}</p>
                </div>
                <button
                  className={`button ${r.next_plan_id ? "secondary" : "primary"} small`}
                  disabled={busy}
                  onClick={() =>
                    r.next_plan_id ? onOpenPlan(r.next_plan_id) : onNext(r)
                  }
                >
                  {r.next_plan_id ? "연결한 계획 보기" : "다음 계획 만들기"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="돌아보기가 다음 계획의 시작이에요"
            description="개선점을 저장하면 이곳에 차곡차곡 남아요."
          />
        )}
      </section>
    </>
  );
}
