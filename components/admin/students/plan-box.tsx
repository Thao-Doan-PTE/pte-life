"use client";

import { useId, useState, useTransition } from "react";
import {
  submitChangePackage,
  submitExtendExpiry,
  submitUseReservation,
  type PlanActionResult,
} from "@/lib/actions/admin";
import { PACKAGE_LABEL } from "@/lib/admin/student-status";
import type { StudentRow } from "@/lib/admin/student-queries";
import type { ExamPackage } from "@/lib/question-types";

type Op = "package" | "extend" | "reserve";
/** neutral = thông báo trung tính (không đổi gì), không tô xanh/đỏ. */
type Feedback = PlanActionResult & { neutral?: boolean };

const QUICK_DAYS = [30, 60, 90];
const MAX_EXTEND_DAYS = 3650;
const GENERIC_ERROR = "Không thực hiện được thao tác. Vui lòng thử lại.";

/** Ô "Gói học & thời hạn": đổi gói, gia hạn, dùng lượt bảo lưu (xác nhận 2 bước).
 * Gọi bản trả kết quả {ok, message} của 3 thao tác gốc trong lib/actions/admin.ts
 * (cùng phần lõi, cùng nội dung nhật ký). Sau khi lưu, server làm mới trang nên
 * số liệu trong drawer và bảng tự cập nhật. */
export function PlanBox({ row }: { row: StudentRow }) {
  const id = useId();
  const [pkg, setPkg] = useState<ExamPackage>(row.examPackage);
  const [days, setDays] = useState("30");
  const [confirmReserve, setConfirmReserve] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(nextOp: Op, action: (fd: FormData) => Promise<PlanActionResult>, fields: Record<string, string>) {
    const fd = new FormData();
    fd.set("userId", row.id);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    setOp(nextOp);
    setFeedback(null);
    startTransition(async () => {
      let result: PlanActionResult;
      try {
        result = await action(fd);
      } catch {
        result = { ok: false, message: GENERIC_ERROR };
      }
      setFeedback(result);
      setConfirmReserve(false);
    });
  }

  function savePackage() {
    if (pkg === row.examPackage) {
      setFeedback({ ok: true, message: "Gói không thay đổi.", neutral: true });
      return;
    }
    run("package", submitChangePackage, { examPackage: pkg });
  }

  function extend() {
    const n = Number(days);
    if (!days.trim() || !Number.isInteger(n) || n <= 0) {
      setFeedback({ ok: false, message: "Nhập số ngày lớn hơn 0." });
      return;
    }
    if (n > MAX_EXTEND_DAYS) {
      setFeedback({ ok: false, message: `Mỗi lần gia hạn tối đa ${MAX_EXTEND_DAYS} ngày.` });
      return;
    }
    run("extend", submitExtendExpiry, { days: String(n) });
  }

  const busy = isPending;
  const label = (target: Op, idle: string) => (busy && op === target ? "Đang lưu…" : idle);
  // Đổi gói không tự gỡ khỏi lớp → nhắc trước khi lưu nếu lớp đang học khác gói mới.
  const classesOffNewPackage = pkg !== row.examPackage ? row.activeClasses.filter((c) => c.examType !== pkg) : [];

  return (
    <div className="rounded-[10px] border p-3.5" style={{ borderColor: "var(--adm-line)" }}>
      <div className="flex flex-col gap-3">
        {/* Đổi gói */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-[160px] flex-1 flex-col gap-1">
            <label htmlFor={`${id}-pkg`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
              Đổi gói
            </label>
            <select
              id={`${id}-pkg`}
              className="adm-input w-full"
              value={pkg}
              onChange={(e) => setPkg(e.target.value as ExamPackage)}
              disabled={busy}
            >
              <option value="academic">{PACKAGE_LABEL.academic}</option>
              <option value="core">{PACKAGE_LABEL.core}</option>
            </select>
          </div>
          <button type="button" className="adm-btn" onClick={savePackage} disabled={busy}>
            {label("package", "Lưu")}
          </button>
        </div>
        {classesOffNewPackage.length > 0 && (
          <p className="-mt-1 text-[12px]" style={{ color: "var(--adm-warn)" }}>
            {`Học viên đang học lớp ${classesOffNewPackage.map((c) => c.code).join(", ")} (${PACKAGE_LABEL[row.examPackage]}). ` +
              `Đổi gói không tự rời lớp — sau khi lưu cần xếp lại lớp ${PACKAGE_LABEL[pkg]}.`}
          </p>
        )}

        {/* Gia hạn */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <label htmlFor={`${id}-days`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
              Gia hạn (ngày)
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_DAYS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="adm-btn adm-btn-sm adm-num"
                  onClick={() => setDays(String(n))}
                  title={`Điền ${n} ngày`}
                  disabled={busy}
                >
                  +{n}
                </button>
              ))}
              <input
                id={`${id}-days`}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_EXTEND_DAYS}
                step={1}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    extend();
                  }
                }}
                className="adm-input adm-num w-[80px]"
                disabled={busy}
              />
            </div>
          </div>
          <button type="button" className="adm-btn adm-btn-pri" onClick={extend} disabled={busy}>
            {label("extend", "Gia hạn")}
          </button>
        </div>

        {/* Bảo lưu */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
          style={{ borderColor: "var(--adm-line)" }}
        >
          <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Bảo lưu: trừ 1 lượt, cộng 30 ngày vào hạn và gắn nhãn “Bảo lưu” tối đa 30 ngày, không quá ngày hết hạn mới (học viên vẫn học bình thường).
          </span>
          {row.reservationsLeft <= 0 ? (
            <span className="adm-pill adm-pill-mute">Hết lượt bảo lưu</span>
          ) : confirmReserve ? (
            <span className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className="adm-btn adm-btn-sm adm-btn-ghost"
                onClick={() => setConfirmReserve(false)}
                disabled={busy}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="adm-btn adm-btn-sm adm-btn-danger"
                onClick={() => run("reserve", submitUseReservation, {})}
                disabled={busy}
                autoFocus
              >
                {label("reserve", "Xác nhận dùng 1 lượt")}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="adm-btn adm-btn-sm"
              onClick={() => {
                setFeedback(null);
                setConfirmReserve(true);
              }}
              disabled={busy}
            >
              Dùng 1 lượt bảo lưu
            </button>
          )}
        </div>
      </div>

      {/* Luôn có trong DOM (kể cả khi rỗng) để trình đọc màn hình đọc được thông báo mới. */}
      <p
        role="status"
        aria-live="polite"
        className={feedback ? "mt-3 text-[12.5px] font-semibold" : "text-[12.5px]"}
        style={{
          color:
            !feedback || feedback.neutral
              ? "var(--adm-ink-2)"
              : feedback.ok
                ? "var(--adm-ok)"
                : "var(--adm-brand-text)",
        }}
      >
        {feedback?.message ?? ""}
      </p>
    </div>
  );
}
