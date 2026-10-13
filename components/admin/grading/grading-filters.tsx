"use client";

import { useId, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GradingFilterOptions } from "@/lib/admin/grading-queries";

/** Lọc hàng chờ theo lớp / bài tập (?class=…, ?assignment=…). Chỉ liệt kê lớp và
 * bài tập trong phạm vi người xem; server vẫn AND bộ lọc với phạm vi lớp. */
export function GradingFilters({
  options,
  classId,
  assignmentId,
}: {
  options: GradingFilterOptions;
  classId: string | null;
  assignmentId: string | null;
}) {
  const id = useId();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const go = (next: { classId: string | null; assignmentId: string | null }) => {
    const p = new URLSearchParams();
    if (next.classId) p.set("class", next.classId);
    if (next.assignmentId) p.set("assignment", next.assignmentId);
    const qs = p.toString();
    startTransition(() => router.replace(qs ? `/admin/grading?${qs}` : "/admin/grading", { scroll: false }));
  };

  const assignments = classId ? options.assignments.filter((a) => a.classId === classId) : options.assignments;
  const active = !!(classId || assignmentId);

  return (
    <div className="flex flex-wrap items-end gap-2.5" aria-busy={isPending || undefined}>
      {options.classes.length > 1 && (
        <div className="flex min-w-[140px] flex-col gap-1">
          <label htmlFor={`${id}-class`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Lớp
          </label>
          <select
            id={`${id}-class`}
            className="adm-input"
            value={classId ?? ""}
            onChange={(e) => {
              const next = e.target.value || null;
              const keepAssignment = assignmentId && options.assignments.some((a) => a.id === assignmentId && a.classId === next);
              go({ classId: next, assignmentId: keepAssignment ? assignmentId : null });
            }}
          >
            <option value="">Tất cả lớp</option>
            {options.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[360px]">
        <label htmlFor={`${id}-assignment`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
          Bài tập
        </label>
        <select
          id={`${id}-assignment`}
          className="adm-input w-full"
          value={assignmentId ?? ""}
          onChange={(e) => go({ classId, assignmentId: e.target.value || null })}
        >
          <option value="">Tất cả bài tập</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {`${a.title} · ${a.classCode}${a.pending > 0 ? ` (${a.pending} chờ chấm)` : ""}`}
            </option>
          ))}
        </select>
      </div>
      {active && (
        <Link href="/admin/grading" className="adm-btn adm-btn-ghost adm-btn-sm" scroll={false}>
          Bỏ lọc
        </Link>
      )}
    </div>
  );
}
