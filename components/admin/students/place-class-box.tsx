"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { enrollStudentFormAction } from "@/lib/actions/classes";
import { PACKAGE_LABEL } from "@/lib/admin/student-status";
import type { PlaceableClass, StudentRow } from "@/lib/admin/student-queries";

type Feedback = { ok: boolean; message: string };

const STATUS_LABEL: Record<PlaceableClass["status"], string> = {
  ACTIVE: "Đang học",
  UPCOMING: "Sắp khai giảng",
};

/** Ô "Xếp lớp" trong drawer: chỉ liệt kê lớp đang học / sắp khai giảng CÙNG gói
 * với học viên (server cũng kiểm tra lại khi lưu). Dùng thao tác xếp lớp có sẵn
 * của trang Lớp học (lib/actions/classes.ts) — theo quyết định 8A, xếp vào lớp
 * mới sẽ chuyển học viên khỏi các lớp đang học khác (server thực hiện). */
export function PlaceClassBox({ row, classes }: { row: StudentRow; classes: PlaceableClass[] }) {
  const id = useId();
  const [chosen, setChosen] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isPending, startTransition] = useTransition();

  const enrolledIds = new Set(row.activeClasses.map((c) => c.id));
  // Học viên còn kẹt ở nhiều lớp (dữ liệu cũ): cho chọn cả lớp đang học để GIỮ
  // lớp đó và rời các lớp khác (server xử lý theo 8A). Chỉ ở đúng 1 lớp thì lớp
  // đó không chọn lại được.
  const multiClass = row.activeClasses.length > 1;
  const available = multiClass ? classes : classes.filter((c) => !enrolledIds.has(c.id));
  // Lớp vừa chọn đã được xếp xong (không còn khả dụng) → quay về lớp đầu tiên.
  const classId = chosen && available.some((c) => c.id === chosen) ? chosen : (available[0]?.id ?? "");

  function save() {
    if (!classId) {
      setFeedback({ ok: false, message: "Chọn lớp cần xếp." });
      return;
    }
    const code = classes.find((c) => c.id === classId)?.code ?? "";
    const fd = new FormData();
    fd.set("classId", classId);
    fd.set("studentId", row.id);
    setFeedback(null);
    startTransition(async () => {
      try {
        const res = await enrollStudentFormAction(null, fd);
        if (res?.error) setFeedback({ ok: false, message: res.error });
        else setFeedback({ ok: true, message: res?.success ?? `Đã xếp vào lớp ${code}.` });
      } catch {
        setFeedback({ ok: false, message: "Không xếp được lớp. Vui lòng thử lại." });
      }
    });
  }

  const current = row.activeClasses[0];
  const moveNoteId = `${id}-move-note`;

  return (
    <div className="flex flex-col gap-2">
      {classes.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Chưa có lớp {PACKAGE_LABEL[row.examPackage]} nào đang học hoặc sắp khai giảng.{" "}
          <Link href="/admin/classes" className="font-semibold underline underline-offset-2">
            Xem lớp học
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1">
            <label htmlFor={`${id}-class`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
              Lớp {PACKAGE_LABEL[row.examPackage]}
            </label>
            <select
              id={`${id}-class`}
              className="adm-input w-full"
              value={classId}
              onChange={(e) => setChosen(e.target.value)}
              disabled={isPending || available.length === 0}
              aria-describedby={current ? moveNoteId : undefined}
            >
              {available.length === 0 && <option value="">— Đã ở mọi lớp cùng gói —</option>}
              {classes.map((c) => (
                <option key={c.id} value={c.id} disabled={!multiClass && enrolledIds.has(c.id)}>
                  {`${c.code} — ${c.name} · ${STATUS_LABEL[c.status]} · ${c.studentCount} HV${
                    enrolledIds.has(c.id) ? (multiClass ? " (đang học — giữ lớp này, rời lớp khác)" : " (đang học)") : ""
                  }`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="adm-btn"
            onClick={save}
            disabled={isPending || available.length === 0}
          >
            {isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      )}

      {current && (
        <p id={moveNoteId} className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Đang học {multiClass ? `${row.activeClasses.length} lớp` : "lớp"}{" "}
          {row.activeClasses.map((c, i) => (
            <span key={c.id}>
              {i > 0 ? ", " : ""}
              <Link href={`/admin/classes/${c.id}`} className="font-semibold underline underline-offset-2">
                {c.code}
              </Link>
            </span>
          ))}
          .{" "}
          {multiClass ? (
            <>
              <span className="font-semibold" style={{ color: "var(--adm-warn)" }}>
                Mỗi học viên chỉ học 1 lớp
              </span>{" "}
              — lớp được chọn sẽ giữ lại (kể cả lớp đang học), các lớp còn lại chuyển sang đã rời.
            </>
          ) : (
            <>
              <span className="font-semibold" style={{ color: "var(--adm-warn)" }}>
                Học viên sẽ được chuyển khỏi lớp hiện tại
              </span>{" "}
              khi xếp vào lớp mới.
            </>
          )}
        </p>
      )}

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
