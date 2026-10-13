"use client";

import { useActionState, useId } from "react";
import { updateClassSessionsAction, type ClassFormState } from "@/lib/actions/classes";
import { FormNotice, SubmitButton, useSubmitKeepingValues } from "@/components/admin/classes/form-buttons";

const MAX_SESSIONS = 500;

/** Sửa số buổi đã học / tổng số buổi của lớp (chỉ người có quyền quản lý lớp;
 * server kiểm tra lại quyền và khoảng giá trị). */
export function ClassSessionsForm({
  classId,
  sessionsDone,
  sessionsTotal,
}: {
  classId: string;
  sessionsDone: number;
  sessionsTotal: number | null;
}) {
  const [state, formAction, pending] = useActionState<ClassFormState, FormData>(
    (_prev, formData) => updateClassSessionsAction(formData),
    null
  );
  // Không dùng <form action>: React reset form trước khi chạy action → báo lỗi thì mất số vừa nhập.
  const onSubmit = useSubmitKeepingValues(formAction);
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    // Ô nhập không điều khiển: lưu xong vẫn giữ đúng số vừa nhập (= số đã lưu) và giữ
    // nguyên focus trên nút Lưu (không dựng lại form).
    <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
      <input type="hidden" name="classId" value={classId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-[1_1_110px] flex-col gap-1">
          <label htmlFor={`${id}-done`} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Buổi đã học
          </label>
          <input
            id={`${id}-done`}
            type="number"
            name="sessionsDone"
            min={0}
            // Không lấy tổng số buổi đang lưu làm max: người dùng có thể tăng tổng trong cùng lần lưu.
            max={MAX_SESSIONS}
            step={1}
            inputMode="numeric"
            required
            defaultValue={sessionsDone}
            aria-describedby={hintId}
            className="adm-input adm-num w-full"
          />
        </div>
        <div className="flex min-w-0 flex-[1_1_110px] flex-col gap-1">
          <label htmlFor={`${id}-total`} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Tổng số buổi
          </label>
          <input
            id={`${id}-total`}
            type="number"
            name="sessionsTotal"
            min={1}
            max={MAX_SESSIONS}
            step={1}
            inputMode="numeric"
            defaultValue={sessionsTotal ?? ""}
            placeholder="Chưa nhập"
            aria-describedby={hintId}
            className="adm-input adm-num w-full"
          />
        </div>
        <SubmitButton className="adm-btn-sm" pendingLabel="Đang lưu…" pending={pending}>
          Lưu số buổi
        </SubmitButton>
      </div>
      <p id={hintId} className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        Tổng số buổi từ 1 đến {MAX_SESSIONS} (để trống nếu chưa chốt). Buổi đã học không vượt quá tổng.
      </p>
      <FormNotice state={state} />
    </form>
  );
}
