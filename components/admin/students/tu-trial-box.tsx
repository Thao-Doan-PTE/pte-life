"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Pill } from "@/components/admin/admin-ui";
import { TU_TRIAL_DAY_CHOICES, TU_TRIAL_SCOPE_NOTE } from "@/components/admin/students/student-format";
import { setTuTrialAction, type TuTrialActionResult } from "@/lib/actions/admin";
import { endOfVnDay, formatVnDate } from "@/lib/admin/student-status";
import type { StudentRow } from "@/lib/admin/student-queries";

const GENERIC_ERROR = "Không thực hiện được thao tác. Vui lòng thử lại.";

type Op = "set" | "clear";

/** Ô "Dùng thử Luyện đề Tủ" trong drawer (chỉ managePlans): mời / gia hạn theo
 * số ngày tính từ hôm nay, và tắt dùng thử (xác nhận 2 bước). Server kiểm tra lại
 * quyền, role STUDENT và số ngày (setTuTrialAction); sau khi lưu trang tự làm mới
 * nên trạng thái trong drawer và bảng cập nhật theo. */
export function TuTrialBox({ row }: { row: StudentRow }) {
  const id = useId();
  const [days, setDays] = useState("30");
  const [confirmOff, setConfirmOff] = useState(false);
  const [feedback, setFeedback] = useState<TuTrialActionResult | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectRef = useRef<HTMLSelectElement>(null);
  const setButtonRef = useRef<HTMLButtonElement>(null);
  const offButtonRef = useRef<HTMLButtonElement>(null);
  /** Phần tử cần nhận focus khi các nút bật lại (nút đang focus biến mất hoặc bị
   * khoá trong lúc lưu khiến trình duyệt đẩy focus về <body>). */
  const focusNext = useRef<"select" | "set" | "off" | null>(null);

  const active = row.tuTrialActive;
  const expired = !active && row.tuTrialUntil !== null;
  const currentUntil = row.tuTrialUntil ? new Date(row.tuTrialUntil) : null;

  // Đã tắt xong (hoặc hết hạn) thì bỏ bước xác nhận đang mở.
  if (confirmOff && !active) setConfirmOff(false);

  // Chỉ chuyển focus khi đã lưu xong: lúc đang lưu các nút/ô chọn bị disabled nên
  // gọi .focus() không có tác dụng.
  useEffect(() => {
    if (isPending || !focusNext.current) return;
    const target = { select: selectRef, set: setButtonRef, off: offButtonRef }[focusNext.current];
    focusNext.current = null;
    target.current?.focus();
  });

  const newUntil = endOfVnDay(Number(days));
  const shorter = active && currentUntil !== null && newUntil.getTime() < currentUntil.getTime();

  function run(nextOp: Op, value: string) {
    const fd = new FormData();
    fd.set("userId", row.id);
    fd.set("days", value);
    setOp(nextOp);
    setFeedback(null);
    startTransition(async () => {
      let result: TuTrialActionResult;
      try {
        result = await setTuTrialAction(fd);
      } catch {
        result = { ok: false, message: GENERIC_ERROR };
      }
      // Nút "Xác nhận tắt" biến mất sau khi tắt → focus về ô chọn số ngày (tắt
      // lỗi thì về nút "Tắt dùng thử"); mời / gia hạn → về lại nút vừa bấm.
      focusNext.current = nextOp === "set" ? "set" : result.ok ? "select" : "off";
      // Cập nhật sau await phải bọc lại trong startTransition để commit cùng lúc
      // isPending về false (React 19).
      startTransition(() => {
        setFeedback(result);
        setConfirmOff(false);
      });
    });
  }

  const busy = isPending;
  const label = (target: Op, idle: string) => (busy && op === target ? "Đang lưu…" : idle);
  const hintId = `${id}-hint`;
  const confirmId = `${id}-confirm`;

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border p-3.5" style={{ borderColor: "var(--adm-line)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
          Trạng thái:
        </span>
        {active ? (
          <span title={currentUntil ? `Hết ngày ${formatVnDate(currentUntil)}` : undefined}>
            <Pill tone="plum">Đang dùng thử đến {row.tuTrialLabel}</Pill>
          </span>
        ) : expired ? (
          <span title={currentUntil ? `Hết ngày ${formatVnDate(currentUntil)}` : undefined}>
            <Pill tone="mute">Đã hết hạn {row.tuTrialLabel}</Pill>
          </span>
        ) : (
          <Pill tone="mute">Chưa mời</Pill>
        )}
      </div>

      {row.activeClasses.length > 0 && (
        <p className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Học viên đang học lớp {row.activeClasses.map((c) => c.code).join(", ")} nên đã vào được mọi phần luyện tập —
          dùng thử chỉ có tác dụng khi không còn lớp.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[150px] flex-1 flex-col gap-1">
          <label htmlFor={`${id}-days`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Thời gian dùng thử
          </label>
          <select
            ref={selectRef}
            id={`${id}-days`}
            className="adm-input w-full"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            aria-describedby={hintId}
            disabled={busy}
          >
            {TU_TRIAL_DAY_CHOICES.map((n) => (
              <option key={n} value={String(n)}>
                {n} ngày
              </option>
            ))}
          </select>
        </div>
        <button
          ref={setButtonRef}
          type="button"
          className="adm-btn adm-btn-pri"
          onClick={() => run("set", days)}
          disabled={busy}
        >
          {label("set", active ? "Gia hạn" : "Mời dùng thử")}
        </button>
      </div>
      <p id={hintId} className="-mt-1.5 text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        Hạn mới tính từ hôm nay: hết ngày <span className="adm-num">{formatVnDate(newUntil)}</span>
        {shorter && (
          <span className="font-semibold" style={{ color: "var(--adm-warn)" }}>
            {" "}
            — sớm hơn hạn hiện tại
          </span>
        )}
        .
      </p>

      {active && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-t pt-3"
          style={{ borderColor: "var(--adm-line)" }}
        >
          {confirmOff ? (
            <>
              <span id={confirmId} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-warn)" }}>
                Tắt ngay? Học viên sẽ không vào được bộ đề Tủ nữa.
              </span>
              <span className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="adm-btn adm-btn-sm adm-btn-ghost"
                  onClick={() => {
                    focusNext.current = "off";
                    setConfirmOff(false);
                  }}
                  disabled={busy}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn-sm adm-btn-danger"
                  onClick={() => run("clear", "clear")}
                  disabled={busy}
                  aria-describedby={confirmId}
                  autoFocus
                >
                  {label("clear", "Xác nhận tắt")}
                </button>
              </span>
            </>
          ) : (
            <>
              <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                Thu hồi quyền dùng thử ngay lập tức.
              </span>
              <button
                ref={offButtonRef}
                type="button"
                className="adm-btn adm-btn-sm"
                onClick={() => {
                  setFeedback(null);
                  setConfirmOff(true);
                }}
                disabled={busy}
              >
                Tắt dùng thử
              </button>
            </>
          )}
        </div>
      )}

      <p className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        {TU_TRIAL_SCOPE_NOTE}
      </p>

      {/* Luôn có trong DOM (kể cả khi rỗng) để trình đọc màn hình đọc được thông báo mới. */}
      <p
        role="status"
        aria-live="polite"
        className={feedback?.ok ? "text-[12.5px] font-semibold" : "sr-only"}
        style={{ color: feedback?.neutral ? "var(--adm-ink-2)" : "var(--adm-ok)" }}
      >
        {feedback?.ok ? feedback.message : ""}
      </p>
      <p
        role="alert"
        className={feedback && !feedback.ok ? "text-[12.5px] font-semibold" : "sr-only"}
        style={{ color: "var(--adm-brand-text)" }}
      >
        {feedback && !feedback.ok ? feedback.message : ""}
      </p>
    </div>
  );
}
