"use client";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Modal, FormError } from "@/src/components/ui/Modal";
import { seoulDate, priorities } from "@/src/shared/domain";
import type { Plan, Task, Review } from "@/src/shared/domain";
import type { RunAction } from "@/src/shared/client";
export default function PlanForm({
  plan,
  review,
  tasks = [],
  run,
  onClose,
  onSaved,
}: {
  plan?: Plan;
  review?: Review;
  tasks?: Task[];
  run: RunAction;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<{ message: string; field?: string } | null>(
      null,
    );
  const [copy, setCopy] = useState(true);
  const [title, setTitle] = useState(
    plan ? `${plan.title}${review ? " · 다음 계획" : ""}` : "",
  );
  const [criteria, setCriteria] = useState(plan?.success_criteria || "");
  const [priority, setPriority] = useState(plan?.priority || "medium");
  const [estimate, setEstimate] = useState(
    String(plan?.estimated_minutes ?? 60),
  );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      title: fd.get("title"),
      start_date: fd.get("start_date"),
      end_date: fd.get("end_date"),
      priority: fd.get("priority"),
      success_criteria: fd.get("success_criteria"),
      estimated_minutes: Number(fd.get("estimated_minutes")),
    };
    if (String(data.start_date) > String(data.end_date)) {
      setError({
        message: "종료일은 시작일 이후여야 합니다.",
        field: "end_date",
      });
      return;
    }
    if (review) {
      data.review_id = review.id;
      data.task_ids = fd.getAll("task_ids");
    } else if (plan) data.id = plan.id;
    setBusy(true);
    try {
      const result = await run(review ? "review.next" : "plan.save", data);
      onSaved(result.id);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        review ? "다음 계획으로 한 걸음" : plan ? "계획 다듬기" : "새로운 계획"
      }
      subtitle={
        review
          ? "이번에 배운 한 가지를 다음 계획에 이어 주세요."
          : "무엇을, 언제까지, 얼마나 해볼까요?"
      }
      onClose={onClose}
      busy={busy}
    >
      {review && (
        <div className="insight-note">
          <span className="eyebrow">이어갈 개선점</span>
          <p>{review.improvement}</p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={copy}
              disabled={busy}
              onChange={(e) => {
                const checked = e.target.checked;
                setCopy(checked);
                setTitle(checked && plan ? `${plan.title} · 다음 계획` : "");
                setCriteria(checked && plan ? plan.success_criteria : "");
                setPriority(checked && plan ? plan.priority : "medium");
                setEstimate(
                  String(checked && plan ? plan.estimated_minutes : 60),
                );
              }}
            />
            기존 계획의 제목·성공 기준·우선순위·예상 시간 가져오기
          </label>
        </div>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            계획 이름
            <input
              name="title"
              maxLength={200}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 매일 조금씩, 나만의 앱 완성하기"
              autoFocus
            />
          </label>
          <div className="form-grid">
            <label>
              시작일
              <input
                name="start_date"
                type="date"
                required
                defaultValue={
                  review ? seoulDate() : plan?.start_date || seoulDate()
                }
              />
            </label>
            <label>
              종료일
              <input
                name="end_date"
                type="date"
                required
                defaultValue={
                  review ? seoulDate() : plan?.end_date || seoulDate()
                }
                aria-invalid={error?.field === "end_date"}
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              우선순위
              <select
                name="priority"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as Plan["priority"])
                }
              >
                {Object.entries(priorities).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              예상 시간 <span className="label-unit">분</span>
              <input
                name="estimated_minutes"
                type="number"
                min={0}
                max={1000000}
                required
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
              />
            </label>
          </div>
          <label>
            성공 기준
            <textarea
              name="success_criteria"
              maxLength={2000}
              required
              rows={3}
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="어떤 모습이면 해냈다고 말할 수 있을까요?"
            />
          </label>
          {review && tasks.length > 0 && (
            <div className="copy-tasks">
              <p className="field-title">
                가져올 할 일{" "}
                <span className="muted">선택 사항 · 최대 50개</span>
              </p>
              <p className="hint">
                새 할 일은 미완료로 시작하며, 마감일은 새 계획의 종료일로
                설정됩니다.
              </p>
              {tasks.map((t) => (
                <label className="check-label" key={t.id}>
                  <input type="checkbox" name="task_ids" value={t.id} />
                  {t.title}
                </label>
              ))}
            </div>
          )}
          <FormError error={error} />
          <div className="modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              취소
            </button>
            <button className="button primary" type="submit">
              {busy && <LoaderCircle size={17} className="spin" />}
              {busy ? "저장 중…" : review ? "다음 계획 만들기" : "계획 저장"}
            </button>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
