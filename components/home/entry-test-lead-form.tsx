"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { StageCard } from "@/components/home/stage-intro";
import { submitEntryTestLeadAction, type EntryTestLeadState } from "@/lib/actions/entry-test";

const initialState: EntryTestLeadState = {};

const fieldClass = "h-[42px] w-full border px-3 text-[15px]";
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

export function EntryTestLeadForm() {
  const [state, formAction, pending] = useActionState(submitEntryTestLeadAction, initialState);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  const [showPassword, setShowPassword] = useState(false);

  if (state.success) {
    return (
      <StageCard>
        <div className="grid size-11 place-items-center rounded-full" style={{ background: "var(--rail-ok-tint)" }} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--rail-ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-10" />
          </svg>
        </div>
        <h3 className="mt-3 mb-1.5 text-[20px] font-bold" style={{ color: "var(--rail-ink)" }}>
          Đã lưu thông tin!
        </h3>
        <p className="mb-4 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
          Bài test gồm 3 phần. Bạn nên dùng máy tính có micro và tai nghe, ngồi nơi yên tĩnh.
        </p>
        <ul className="m-0 mb-4.5 flex list-none flex-col gap-2 p-0 text-[14px]">
          {[
            ["Phần 1 · Speaking & Writing", "Cần micro"],
            ["Phần 2 · Reading", "Chỉ cần máy tính"],
            ["Phần 3 · Listening", "Cần tai nghe"],
          ].map(([label, note]) => (
            <li key={label} className="flex items-center justify-between gap-2.5 px-3 py-2.5" style={{ background: "var(--rail-surface)" }}>
              <span>{label}</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
        <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
          Đội tư vấn PTE-Life sẽ liên hệ trong 24h để sắp xếp lịch làm test đầu vào phù hợp với bạn.
        </p>
      </StageCard>
    );
  }

  return (
    <StageCard
      style={{
        border: "1px solid var(--rail-line)",
        boxShadow: "0 36px 70px -22px rgba(43,33,32,.5), 0 12px 24px -10px rgba(43,33,32,.25)",
      }}
    >
      <form action={formAction} noValidate>
        <div className="mb-4">
          <b className="text-2xl tracking-wide uppercase" style={{ color: "var(--rail-charcoal)" }}>
            Đăng ký làm test đầu vào
          </b>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Họ và tên" required error={errors.name}>
              <input id="name" name="name" defaultValue={values.name} autoComplete="name" placeholder="Nguyễn Văn A" className={fieldClass} style={fieldStyle} />
            </Field>
          </div>
          <Field label="Số điện thoại" required error={errors.phone}>
            <input id="phone" name="phone" defaultValue={values.phone} inputMode="tel" autoComplete="tel" placeholder="09xx xxx xxx" className={fieldClass} style={fieldStyle} />
          </Field>
          <Field label="Email" required error={errors.email}>
            <input id="email" name="email" defaultValue={values.email} type="email" autoComplete="email" placeholder="ban@email.com" className={fieldClass} style={fieldStyle} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Mật khẩu" required error={errors.password}>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mật khẩu"
                  className={`${fieldClass} pr-10`}
                  style={fieldStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute top-1/2 right-3 -translate-y-1/2"
                  style={{ color: "var(--rail-ink-dim)" }}
                >
                  {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                </button>
              </div>
              <span className="text-[13px] italic" style={{ color: "var(--rail-ink-dim)" }}>
                Mật khẩu phải nhiều hơn 8 ký tự
              </span>
            </Field>
          </div>
          <Field label="Điểm mục tiêu" required error={errors.target}>
            <select key={values.target} id="target" name="target" className={fieldClass} style={fieldStyle} defaultValue={values.target ?? ""}>
              <option value="">Chọn điểm</option>
              {["30+", "36+", "42+", "50+", "58+", "65+", "79+", "Chưa rõ, cần tư vấn"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Mục đích" required error={errors.goal}>
            <select key={values.goal} id="goal" name="goal" className={fieldClass} style={fieldStyle} defaultValue={values.goal ?? ""}>
              <option value="">Chọn mục đích</option>
              {["Du học", "Định cư", "Xin việc / hành nghề", "Khác"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Dự kiến thi">
              <select key={values.when} id="when" name="when" className={fieldClass} style={fieldStyle} defaultValue={values.when ?? "Chưa xác định"}>
                {["Chưa xác định", "Trong 1 tháng tới", "1–3 tháng tới", "3–6 tháng tới", "Trên 6 tháng"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 w-full items-center justify-center font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: "var(--rail-red)" }}
            >
              {pending ? "Đang gửi..." : "Đăng ký tài khoản →"}
            </button>
          </div>
        </div>
      </form>
    </StageCard>
  );
}
