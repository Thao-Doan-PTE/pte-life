"use client";

import { useEffect, useId, useRef, useState, useTransition, type RefObject } from "react";
import { X } from "lucide-react";
import { TU_TRIAL_BULK_MAX, TU_TRIAL_DAY_CHOICES } from "@/components/admin/students/student-format";
import { bulkSetTuTrialAction, type TuTrialActionResult } from "@/lib/actions/admin";
import { endOfVnDay, formatVnDate } from "@/lib/admin/student-status";

const GENERIC_ERROR = "Không thực hiện được thao tác. Vui lòng thử lại.";

type Op = "invite" | "clear";

/** Phần tử nhận focus khi thanh bật lại sau thao tác (nút đang focus biến mất). */
type FocusTarget = "invite" | "off" | "close" | "selectAll";

/** Thanh thao tác hàng loạt của bảng học viên (chỉ managePlans): mời dùng thử
 * Luyện đề Tủ N ngày / tắt dùng thử (xác nhận 2 bước) cho các dòng đã chọn. Dính
 * đáy màn hình khi đang chọn để luôn bấm được trên danh sách dài và màn hẹp.
 * Server kiểm tra lại quyền, role STUDENT, số ngày và giới hạn TU_TRIAL_BULK_MAX
 * học viên; học viên đang có hạn dài hơn hạn mới được giữ nguyên (không rút ngắn).
 * `selectAllRef` = ô "Chọn tất cả" của bảng — nhận focus khi đóng thông báo mà
 * không còn dòng nào được chọn (thanh biến mất). */
export function TuTrialBulkBar({
  selectedIds,
  onClear,
  selectAllRef,
}: {
  selectedIds: string[];
  onClear: () => void;
  selectAllRef?: RefObject<HTMLInputElement | null>;
}) {
  const id = useId();
  const [days, setDays] = useState("30");
  const [confirmOff, setConfirmOff] = useState(false);
  const [feedback, setFeedback] = useState<TuTrialActionResult | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [isPending, startTransition] = useTransition();
  const inviteButtonRef = useRef<HTMLButtonElement>(null);
  const offButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const focusAfter = useRef<FocusTarget | null>(null);

  const count = selectedIds.length;
  const tooMany = count > TU_TRIAL_BULK_MAX;
  // Bỏ hết lựa chọn thì đóng bước xác nhận (không để sót lại cho lần chọn sau).
  if (confirmOff && count === 0) setConfirmOff(false);

  // Chỉ chuyển focus khi đã lưu xong (lúc đang lưu các nút bị disabled).
  useEffect(() => {
    if (isPending || !focusAfter.current) return;
    const key = focusAfter.current;
    focusAfter.current = null;
    const el =
      key === "selectAll"
        ? selectAllRef?.current
        : { invite: inviteButtonRef, off: offButtonRef, close: closeButtonRef }[key].current;
    if (el && !el.disabled) el.focus();
  });

  function run(nextOp: Op, value: string) {
    const fd = new FormData();
    for (const uid of selectedIds) fd.append("userIds", uid);
    fd.set("days", value);
    setOp(nextOp);
    setFeedback(null);
    startTransition(async () => {
      let result: TuTrialActionResult;
      try {
        result = await bulkSetTuTrialAction(fd);
      } catch {
        result = { ok: false, message: GENERIC_ERROR };
      }
      // Thành công → bỏ chọn nên cụm nút biến mất: focus nút "Đóng thông báo"
      // (cạnh kết quả). Lỗi → về lại nút của thao tác vừa làm.
      focusAfter.current = result.ok ? "close" : nextOp === "invite" ? "invite" : "off";
      // Cập nhật sau await phải bọc lại trong startTransition để commit cùng lúc
      // isPending về false (React 19).
      startTransition(() => {
        setFeedback(result);
        setConfirmOff(false);
        if (result.ok) onClear();
      });
    });
  }

  function dismiss() {
    focusAfter.current = count > 0 ? "invite" : "selectAll";
    setFeedback(null);
  }

  const busy = isPending;
  const disabled = busy || tooMany;
  const label = (target: Op, idle: string) => (busy && op === target ? "Đang lưu…" : idle);
  const visible = count > 0 || feedback !== null;
  const confirmId = `${id}-confirm`;
  const inviteHintId = `${id}-invite-hint`;
  // Chỉ hiện khi đã chọn dòng (sau tương tác) nên tính theo giờ máy không lệch SSR.
  const newUntil = count > 0 ? endOfVnDay(Number(days)) : null;

  return (
    <div
      role={visible ? "region" : undefined}
      aria-label={visible ? "Thao tác với học viên đã chọn" : undefined}
      className={visible ? "sticky bottom-0 z-[5] flex flex-col gap-2 rounded-b-[11px] border-t px-4 pt-2.5" : undefined}
      style={
        visible
          ? {
              background: "var(--adm-bg)",
              borderColor: "var(--adm-line)",
              paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))",
            }
          : undefined
      }
    >
      {count > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold">
              Đã chọn <span className="adm-num">{count}</span> học viên
            </span>
            <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={onClear} disabled={busy}>
              Bỏ chọn
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <label htmlFor={`${id}-days`} className="sr-only">
              Thời gian dùng thử Luyện đề Tủ
            </label>
            <select
              id={`${id}-days`}
              className="adm-input"
              style={{ padding: "5px 8px", fontSize: 13 }}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={busy}
            >
              {TU_TRIAL_DAY_CHOICES.map((n) => (
                <option key={n} value={String(n)}>
                  {n} ngày
                </option>
              ))}
            </select>
            <button
              ref={inviteButtonRef}
              type="button"
              className="adm-btn adm-btn-sm adm-btn-pri"
              onClick={() => run("invite", days)}
              disabled={disabled}
              aria-describedby={inviteHintId}
            >
              {label("invite", `Mời dùng thử Tủ ${days} ngày`)}
            </button>

            {confirmOff ? (
              <span className="flex flex-wrap items-center gap-1.5">
                <span id={confirmId} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-warn)" }}>
                  Tắt dùng thử cho {count} học viên?
                </span>
                <button
                  type="button"
                  className="adm-btn adm-btn-sm adm-btn-ghost"
                  onClick={() => {
                    focusAfter.current = "off";
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
                  disabled={disabled}
                  aria-describedby={confirmId}
                  autoFocus
                >
                  {label("clear", "Xác nhận tắt")}
                </button>
              </span>
            ) : (
              <button
                ref={offButtonRef}
                type="button"
                className="adm-btn adm-btn-sm"
                onClick={() => {
                  setFeedback(null);
                  setConfirmOff(true);
                }}
                disabled={disabled}
              >
                Tắt dùng thử
              </button>
            )}
          </div>
        </div>
      )}

      {newUntil && (
        <p id={inviteHintId} className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Mời: hạn mới hết ngày <span className="adm-num">{formatVnDate(newUntil)}</span>; học viên đang có hạn dài
          hơn được giữ nguyên (rút ngắn thì làm trong hồ sơ học viên).
        </p>
      )}

      {tooMany && (
        <p className="text-[12.5px] font-semibold" style={{ color: "var(--adm-warn)" }}>
          Mỗi lần chỉ thao tác tối đa {TU_TRIAL_BULK_MAX} học viên — hãy bỏ bớt lựa chọn.
        </p>
      )}

      {/* Luôn có trong DOM (kể cả khi rỗng) để trình đọc màn hình đọc được thông báo mới. */}
      <div className={feedback ? "flex items-start gap-2" : undefined}>
        <p
          role="status"
          aria-live="polite"
          className={feedback?.ok ? "min-w-0 flex-1 text-[12.5px] font-semibold" : "sr-only"}
          style={{ color: feedback?.neutral ? "var(--adm-ink-2)" : "var(--adm-ok)" }}
        >
          {feedback?.ok ? feedback.message : ""}
        </p>
        <p
          role="alert"
          className={feedback && !feedback.ok ? "min-w-0 flex-1 text-[12.5px] font-semibold" : "sr-only"}
          style={{ color: "var(--adm-brand-text)" }}
        >
          {feedback && !feedback.ok ? feedback.message : ""}
        </p>
        {feedback && (
          <button
            ref={closeButtonRef}
            type="button"
            className="adm-btn adm-btn-sm adm-btn-ghost shrink-0"
            onClick={dismiss}
            aria-label="Đóng thông báo"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
