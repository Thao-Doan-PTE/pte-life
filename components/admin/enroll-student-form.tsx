"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { enrollStudentAction } from "@/lib/actions/classes";

export function EnrollStudentForm({
  classId,
  students,
}: {
  classId: string;
  students: { id: string; name: string; email: string }[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  if (students.length === 0) {
    return <p className="text-sm text-muted-foreground">Không còn học viên nào để thêm.</p>;
  }
  // Nếu học viên đang chọn vừa được thêm vào lớp (không còn trong danh sách khả
  // dụng nữa), quay về học viên đầu tiên thay vì giữ 1 id không còn tồn tại.
  const studentId = selected && students.some((s) => s.id === selected) ? selected : students[0].id;

  return (
    <form action={enrollStudentAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Học viên</label>
        <Select
          items={Object.fromEntries(students.map((s) => [s.id, `${s.name} (${s.email})`]))}
          value={studentId}
          onValueChange={(v) => v && setSelected(v)}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" variant="outline">
        Thêm vào lớp
      </Button>
    </form>
  );
}
