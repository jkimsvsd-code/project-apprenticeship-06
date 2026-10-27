"use client";
import { useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import type { Plan, Revision } from "@/src/shared/domain";
import { formatMinutes, priorities } from "@/src/shared/domain";
export default function History({
  plan,
  revisions,
  onClose,
}: {
  plan: Plan;
  revisions: Revision[];
  onClose: () => void;
}) {
  const rows = revisions
    .filter((r) => r.plan_id === plan.id)
    .sort((a, b) => a.version - b.version);
  const [version, setVersion] = useState(rows[rows.length - 1]?.version || 1);
  const current = rows.find((r) => r.version === version),
    previous = rows.find((r) => r.version === version - 1),
    first = rows[0];
  const fields = [
    ["title", "계획 이름"],
    ["start_date", "시작일"],
    ["end_date", "종료일"],
    ["priority", "우선순위"],
    ["success_criteria", "성공 기준"],
    ["estimated_minutes", "예상 시간"],
  ] as const;
  function value(r: Revision | undefined, k: (typeof fields)[number][0]) {
    if (!r) return "—";
    if (k === "priority") return priorities[r.priority];
    if (k === "estimated_minutes") return formatMinutes(r.estimated_minutes);
    return r[k];
  }
  return (
    <Modal
      title="처음의 생각도, 바뀐 생각도"
      subtitle="계획 ID는 그대로, 수정할 때마다 내용은 이력에 남습니다."
      onClose={onClose}
      wide
    >
      <label>
        확인할 버전
        <select
          value={version}
          onChange={(e) => setVersion(Number(e.target.value))}
        >
          {rows.map((r) => (
            <option key={r.version} value={r.version}>
              v{r.version} {r.version === 1 ? "· 최초 계획" : ""} ·{" "}
              {new Date(r.updated_at).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
              })}
            </option>
          ))}
        </select>
      </label>
      <div className="history-table">
        <table>
          <caption>최초 계획과 선택한 버전의 전후 비교</caption>
          <thead>
            <tr>
              <th>항목</th>
              <th>최초 v1</th>
              <th>이전 {previous ? `v${previous.version}` : ""}</th>
              <th>선택 v{version}</th>
            </tr>
          </thead>
          <tbody>
            {fields.map(([k, label]) => (
              <tr key={k}>
                <th>{label}</th>
                <td>{value(first, k)}</td>
                <td>{value(previous, k)}</td>
                <td
                  className={
                    previous && current && previous[k] !== current[k]
                      ? "changed"
                      : ""
                  }
                >
                  {value(current, k)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
