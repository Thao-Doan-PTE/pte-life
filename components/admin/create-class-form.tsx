"use client";

import { useActionState, useId, type ReactNode } from "react";
import { createClassFormAction, type ClassFormState } from "@/lib/actions/classes";
import { FormNotice, SubmitButton, useSubmitKeepingValues } from "@/components/admin/classes/form-buttons";

/** Form tạo lớp mới (giao diện Admin LMS). Tạo xong tự chuyển sang trang chi tiết lớp. */
export function CreateClassForm({ onCancel }: { onCancel?: () => void }) {
  const [state, formAction, pending] = useActionState<ClassFormState, FormData>(createClassFormAction, null);
  // Không dùng <form action>: React sẽ xoá sạch 6 ô khi server báo lỗi (trùng mã lớp…).
  const onSubmit = useSubmitKeepingValues(formAction);
  const id = useId();
  const fid = (name: string) => `${id}-${name}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Mã lớp" htmlFor={fid("code")} required>
          <input id={fid("code")} name="code" className="adm-input w-full" placeholder="PTEA-2610-02" required maxLength={50} autoComplete="off" />
        </Field>
        <Field label="Gói thi" htmlFor={fid("examType")} required>
          <select id={fid("examType")} name="examType" className="adm-input w-full" defaultValue="academic">
            <option value="academic">PTE Academic</option>
            <option value="core">PTE Core</option>
          </select>
        </Field>
        <Field label="Tên lớp" htmlFor={fid("name")} required className="sm:col-span-2">
          <input id={fid("name")} name="name" className="adm-input w-full" placeholder="PTE Academic 65+ — Tối 3-5-7" required maxLength={200} />
        </Field>
        <Field label="Điểm mục tiêu" htmlFor={fid("targetScore")}>
          <input
            id={fid("targetScore")}
            type="number"
            name="targetScore"
            min={10}
            max={90}
            inputMode="numeric"
            className="adm-input adm-num w-full"
            placeholder="65"
          />
        </Field>
        <Field label="Ngày khai giảng" htmlFor={fid("startDate")}>
          <input id={fid("startDate")} type="date" name="startDate" className="adm-input adm-num w-full" />
        </Field>
        <Field label="Lịch học" htmlFor={fid("schedule")} className="sm:col-span-2">
          <input id={fid("schedule")} name="schedule" className="adm-input w-full" placeholder="T2-T4-T6 19:30–21:00" maxLength={200} />
        </Field>
      </div>

      <FormNotice state={state} />

      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton className="adm-btn-pri" pendingLabel="Đang tạo lớp…" pending={pending}>
          Tạo lớp
        </SubmitButton>
        {onCancel && (
          <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>
            Huỷ
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: "var(--adm-brand-text)" }}>
            {" "}
            *
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
