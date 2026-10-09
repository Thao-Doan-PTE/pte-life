"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClassAction } from "@/lib/actions/classes";
import type { ExamPackage } from "@/lib/question-types";

export function CreateClassForm() {
  const [examType, setExamType] = useState<ExamPackage>("academic");

  return (
    <form action={createClassAction} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <p className="font-medium">Tạo lớp mới</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Mã lớp</label>
          <Input name="code" placeholder="PTEA-2610-02" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Tên lớp</label>
          <Input name="name" placeholder="PTE Academic 65+ — Tối 3-5-7" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Gói thi</label>
          <input type="hidden" name="examType" value={examType} />
          <Select items={{ academic: "PTE Academic", core: "PTE Core" }} value={examType} onValueChange={(v) => v && setExamType(v as ExamPackage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="academic">PTE Academic</SelectItem>
              <SelectItem value="core">PTE Core</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Điểm mục tiêu</label>
          <Input type="number" name="targetScore" placeholder="65" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs text-muted-foreground">Lịch học</label>
          <Input name="schedule" placeholder="T2-T4-T6 19:30–21:00" />
        </div>
      </div>
      <Button type="submit" size="sm" className="w-fit">
        Tạo lớp
      </Button>
    </form>
  );
}
