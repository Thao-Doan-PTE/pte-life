"use client";

import { useId, useState, useTransition } from "react";
import { setTargetScoreAction, type PlanActionResult } from "@/lib/actions/admin";
import type { StudentRow } from "@/lib/admin/student-queries";

const MIN = 10;
const MAX = 90;
const GENERIC_ERROR = "Không lưu được điểm mục tiêu. Vui lòng thử lại.";

/** Ô "Mục tiêu" trong drawer: điểm mục tiêu PTE riêng của học viên (10–90).
 * Để trống + Lưu = xoá, khi đó cột "Đầu vào → mục tiêu" dùng mục tiêu của lớp.
 * Server kiểm tra lại quyền managePlans và giá trị (setTargetScoreAction). */
export function TargetScoreBox({ row }: { row: StudentRow }) {
  const id = useId();
  const [value, setValue] = useState(row.targetScore === null ? "" : String(row.targetScore));
  const [feedback, setFeedback] = useState<PlanActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const classTarget = row.activeClass?.targetScore ?? null;

  function save() {
    const raw = value.trim();
    if (raw !== "") {
      // Ô nhập là text (không dùng type="number": trình duyệt trả "" khi gõ dở
      // "-", "e"… khiến Lưu bị hiểu nhầm thành "xoá") → kiểm tra đúng chuỗi đã gõ.
      const n = /^\d{1,3}$/.test(raw) ? Number(raw) : NaN;
      if (!Number.isInteger(n) || n < MIN || n > MAX) {
        setFeedback({ ok: false, message: `Nhập số nguyên từ ${MIN} đến ${MAX}, hoặc để trống để xoá.` });
        return;
      }
    }
    const fd = new FormData();
    fd.set("userId", row.id);
    fd.set("targetScore", raw);
    setFeedback(null);
    startTransition(async () => {
      try {
        setFeedback(await setTargetScoreAction(fd));
      } catch {
        setFeedback({ ok: false, message: GENERIC_ERROR });
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-target`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Mục tiêu (điểm PTE {MIN}–{MAX})
          </label>
          <input
            id={`${id}-target`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            autoComplete="off"
            value={value}
            placeholder={classTarget !== null ? String(classTarget) : "—"}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
            aria-describedby={`${id}-target-hint`}
            className="adm-input adm-num w-[96px]"
            disabled={isPending}
          />
        </div>
        <button type="button" className="adm-btn" onClick={save} disabled={isPending}>
          {isPending ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
      <p id={`${id}-target-hint`} className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        {classTarget !== null
          ? `Để trống để dùng mục tiêu của lớp ${row.activeClass?.code} (${classTarget}).`
          : "Để trống nếu chưa có mục tiêu."}
      </p>
      <p
        role="status"
        aria-live="polite"
        className={feedback ? "text-[12.5px] font-semibold" : "text-[12.5px]"}
        style={{ color: !feedback ? "var(--adm-ink-2)" : feedback.ok ? "var(--adm-ok)" : "var(--adm-brand-text)" }}
      >
        {feedback?.message ?? ""}
      </p>
    </div>
  );
}
