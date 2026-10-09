"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { CalendarClock, CheckCircle2, X } from "lucide-react";
import { submitConsultationRequestAction, type ConsultationState } from "@/lib/actions/consultation";
import { CONSULTATION_TIME_SLOTS } from "@/lib/consultation-slots";

const initialState: ConsultationState = {};
const fieldClass = "h-[42px] w-full rounded-lg border px-3 text-[15px]";
const fieldStyle = { borderColor: "var(--rail-line)", background: "var(--rail-bg)", color: "var(--rail-ink)" };

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-[14px] font-semibold" style={{ color: "var(--rail-ink)" }}>
        {label} {required && <em className="not-italic" style={{ color: "var(--rail-red-text)" }}>*</em>}
      </label>
      {children}
      {error && (
        <span className="text-[13px]" style={{ color: "var(--rail-red-text)" }}>
          {error}
        </span>
      )}
    </div>
  );
}

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function ConsultationDialog({
  defaultName = "",
  defaultEmail = "",
  label = "Đặt lịch tư vấn lộ trình →",
  buttonClassName = "inline-flex w-fit items-center gap-2 rounded-lg px-5 py-2.5 text-[15px] font-bold text-white transition-colors hover:bg-[var(--rail-red-hover)]",
  buttonStyle = { background: "var(--rail-red)" },
  topic = "consult",
  title = "Đặt lịch tư vấn lộ trình",
  intro = "Chọn ngày và khung giờ bạn tiện nghe máy, tư vấn viên sẽ gọi cho bạn.",
  successTitle = "Đã gửi yêu cầu tư vấn!",
  successText = "Tư vấn viên PTE-Life sẽ liên hệ bạn đúng khung giờ đã hẹn để tư vấn lộ trình phù hợp với kết quả bài test.",
}: {
  defaultName?: string;
  defaultEmail?: string;
  label?: React.ReactNode;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  topic?: "consult" | "trial";
  title?: string;
  intro?: string;
  successTitle?: string;
  successText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(submitConsultationRequestAction, initialState);
  const titleId = useId();
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
        style={buttonStyle}
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4"
          style={{ background: "rgba(0,0,0,.5)" }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-lg rounded-xl p-6" style={{ background: "var(--rail-bg)", boxShadow: "0 30px 70px -20px rgba(0,0,0,.5)" }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="absolute top-3 right-3 grid size-8 place-items-center rounded-md hover:bg-[var(--rail-surface)]"
              style={{ color: "var(--rail-ink-dim)" }}
            >
              <X className="size-5" />
            </button>

            {state.success ? (
              <div className="flex flex-col items-start gap-3 py-2">
                <div className="grid size-11 place-items-center rounded-full" style={{ background: "var(--rail-ok-tint)" }}>
                  <CheckCircle2 className="size-6" style={{ color: "var(--rail-ok)" }} />
                </div>
                <h3 id={titleId} className="m-0 text-[20px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                  {successTitle}
                </h3>
                <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
                  {successText}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-1 rounded-lg px-5 py-2.5 text-[15px] font-bold text-white"
                  style={{ background: "var(--rail-red)" }}
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form action={formAction} noValidate>
                <h3 id={titleId} className="m-0 mb-1 flex items-center gap-2 text-[20px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                  <CalendarClock className="size-5" style={{ color: "var(--rail-red)" }} /> {title}
                </h3>
                <p className="m-0 mb-4 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
                  {intro}
                </p>
                <input type="hidden" name="topic" value={topic} />

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Họ và tên" required error={errors.name}>
                      <input name="name" defaultValue={values.name ?? defaultName} autoComplete="name" className={fieldClass} style={fieldStyle} />
                    </Field>
                  </div>
                  <Field label="Số điện thoại" required error={errors.phone}>
                    <input name="phone" defaultValue={values.phone} inputMode="tel" autoComplete="tel" placeholder="09xx xxx xxx" className={fieldClass} style={fieldStyle} />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input name="email" type="email" defaultValue={values.email ?? defaultEmail} autoComplete="email" className={fieldClass} style={fieldStyle} />
                  </Field>
                  <Field label="Ngày hẹn" required error={errors.date}>
                    <input name="date" type="date" min={todayIso()} defaultValue={values.date} className={fieldClass} style={fieldStyle} />
                  </Field>
                  <Field label="Khung giờ" required error={errors.timeSlot}>
                    <select key={values.timeSlot} name="timeSlot" defaultValue={values.timeSlot ?? ""} className={fieldClass} style={fieldStyle}>
                      <option value="">Chọn khung giờ</option>
                      {CONSULTATION_TIME_SLOTS.map((slot) => (
                        <option key={slot}>{slot}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Ghi chú (không bắt buộc)">
                      <textarea
                        name="note"
                        defaultValue={values.note}
                        rows={3}
                        maxLength={500}
                        placeholder="Mục tiêu điểm, thời gian dự kiến thi, điều bạn muốn được tư vấn..."
                        className="w-full rounded-lg border px-3 py-2 text-[15px]"
                        style={fieldStyle}
                      />
                    </Field>
                  </div>
                </div>

                {state.error && (
                  <p className="m-0 mt-3 text-[15px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
                    {state.error}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border px-4 py-2.5 text-[15px] font-semibold"
                    style={{ borderColor: "var(--rail-line)", color: "var(--rail-ink)" }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg px-5 py-2.5 text-[15px] font-bold text-white disabled:opacity-60"
                    style={{ background: "var(--rail-red)" }}
                  >
                    {pending ? "Đang gửi..." : "Gửi yêu cầu"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
