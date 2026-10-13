"use client";

import { useActionState, useId, useState } from "react";
import { enrollStudentFormAction, type ClassFormState } from "@/lib/actions/classes";
import { FormNotice, SubmitButton, useSubmitKeepingValues } from "@/components/admin/classes/form-buttons";

export interface EnrollStudentOption {
  id: string;
  name: string;
  email: string;
  /** Mã các lớp học viên đang học (nếu có) — thêm vào lớp này sẽ chuyển họ khỏi các lớp đó. */
  currentClasses?: string[];
  locked?: boolean;
}

/** Thêm học viên vào lớp. Danh sách chỉ gồm học viên cùng gói với lớp (server
 * vẫn kiểm tra lại: khác gói / lớp đã đóng → báo lỗi ngay trên form). Học viên
 * đang học lớp khác sẽ được chuyển sang lớp này (server tự cho rời lớp cũ). */
export function EnrollStudentForm({
  classId,
  students,
  packageLabel,
}: {
  classId: string;
  students: EnrollStudentOption[];
  /** VD "PTE Academic" — hiện trong ghi chú dưới form. */
  packageLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<ClassFormState, FormData>(enrollStudentFormAction, null);
  // Không dùng <form action>: React reset form trước mỗi lần gửi → khi server báo lỗi, ô chọn
  // quay về học viên đầu danh sách và bấm lại sẽ thêm nhầm người.
  const onSubmit = useSubmitKeepingValues(formAction);
  const [query, setQuery] = useState("");
  const id = useId();

  if (students.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
        Không còn học viên {packageLabel ? `gói ${packageLabel} ` : ""}nào để thêm.
      </p>
    );
  }

  const needle = query.trim().toLocaleLowerCase("vi");
  const shown = needle
    ? students.filter((s) => s.name.toLocaleLowerCase("vi").includes(needle) || s.email.toLocaleLowerCase("vi").includes(needle))
    : students;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
      <input type="hidden" name="classId" value={classId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-0 flex-[1_1_160px] flex-col gap-1">
          <label htmlFor={`${id}-q`} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Lọc theo tên / email
          </label>
          <input
            id={`${id}-q`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // Enter trong ô lọc không được gửi form (tránh thêm nhầm học viên đầu danh sách).
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            className="adm-input w-full"
            placeholder="Nhập để lọc…"
            autoComplete="off"
          />
        </div>
        <div className="flex min-w-0 flex-[2_1_240px] flex-col gap-1">
          <label htmlFor={`${id}-student`} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Học viên ({shown.length})
          </label>
          <select id={`${id}-student`} name="studentId" className="adm-input w-full" disabled={shown.length === 0}>
            {shown.map((s) => (
              <option key={s.id} value={s.id}>
                {optionLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <SubmitButton pendingLabel="Đang thêm…" disabled={shown.length === 0} pending={pending}>
          Thêm vào lớp
        </SubmitButton>
      </div>
      {packageLabel && (
        <p className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Chỉ hiện học viên gói {packageLabel} chưa có trong lớp.
        </p>
      )}
      <FormNotice state={state} />
    </form>
  );
}

function optionLabel(s: EnrollStudentOption): string {
  let label = `${s.name} (${s.email})`;
  // Xếp vào lớp này sẽ tự chuyển học viên khỏi lớp đang học (mỗi học viên chỉ 1 lớp).
  if (s.currentClasses && s.currentClasses.length > 0) label += ` — đang học ${s.currentClasses.join(", ")}, sẽ chuyển lớp`;
  if (s.locked) label += " — đã khoá";
  return label;
}
