"use client";

import { useId } from "react";
import { assignTeacherAction } from "@/lib/actions/classes";
import { SubmitButton } from "@/components/admin/classes/form-buttons";

export function AssignTeacherForm({
  classId,
  teachers,
}: {
  classId: string;
  teachers: { id: string; name: string; email: string }[];
}) {
  const id = useId();
  if (teachers.length === 0) {
    return (
      <p className="text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
        Không còn giáo viên nào để phân công (cần tài khoản đang hoạt động mang role Giáo viên).
      </p>
    );
  }

  // Select không điều khiển: sau khi gán xong React tự reset form, giáo viên vừa
  // gán biến khỏi danh sách nên lựa chọn quay về giáo viên đầu tiên.
  return (
    <form action={assignTeacherAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={classId} />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
        <label htmlFor={`${id}-teacher`} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
          Giáo viên
        </label>
        <select id={`${id}-teacher`} name="teacherId" className="adm-input w-full" defaultValue={teachers[0].id}>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.email})
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-[0_1_150px] flex-col gap-1">
        <label htmlFor={`${id}-role`} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
          Vai trò
        </label>
        <select id={`${id}-role`} name="role" className="adm-input w-full" defaultValue="MAIN">
          <option value="MAIN">Giáo viên chính</option>
          <option value="ASSISTANT">Trợ giảng</option>
        </select>
      </div>
      <SubmitButton pendingLabel="Đang gán…">Gán giáo viên</SubmitButton>
    </form>
  );
}
