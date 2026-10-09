"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignTeacherAction } from "@/lib/actions/classes";
import { useState } from "react";

export function AssignTeacherForm({
  classId,
  teachers,
}: {
  classId: string;
  teachers: { id: string; name: string; email: string }[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  if (teachers.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có tài khoản nào mang role Giáo viên.</p>;
  }
  // Nếu giáo viên đang chọn vừa được gán (không còn trong danh sách khả dụng),
  // quay về giáo viên đầu tiên thay vì giữ 1 id không còn tồn tại.
  const teacherId = selected && teachers.some((t) => t.id === selected) ? selected : teachers[0].id;

  return (
    <form action={assignTeacherAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="teacherId" value={teacherId} />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Giáo viên</label>
        <Select
          items={Object.fromEntries(teachers.map((t) => [t.id, `${t.name} (${t.email})`]))}
          value={teacherId}
          onValueChange={(v) => v && setSelected(v)}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" size="sm" variant="outline">
        Gán giáo viên
      </Button>
    </form>
  );
}
