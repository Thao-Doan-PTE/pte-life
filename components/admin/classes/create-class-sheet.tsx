"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CreateClassForm } from "@/components/admin/create-class-form";

/** Nút "+ Tạo lớp" trên thanh tiêu đề trang Lớp học → mở drawer bên phải chứa form tạo lớp. */
export function CreateClassSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<button type="button" className="adm-btn adm-btn-pri adm-btn-sm" />}>
        <Plus className="size-4" aria-hidden="true" />
        Tạo lớp
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        // Portal render ngoài khung admin → tự gắn .admin-theme để dùng token màu.
        className="admin-theme gap-0 p-0 data-[side=right]:w-[min(520px,100%)] data-[side=right]:sm:max-w-none"
        style={{ background: "var(--adm-bg)", color: "var(--adm-ink)", boxShadow: "var(--adm-shadow)", borderColor: "var(--adm-line)" }}
      >
        <div className="flex items-start gap-3 border-b px-5 py-4" style={{ borderColor: "var(--adm-line)" }}>
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-[16px] font-bold" style={{ color: "var(--adm-ink)" }}>
              Tạo lớp mới
            </SheetTitle>
            <SheetDescription className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Tạo xong sẽ chuyển sang trang lớp để phân công giáo viên và xếp học viên.
            </SheetDescription>
          </div>
          <SheetClose
            render={<button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" aria-label="Đóng" />}
          >
            <X className="size-4" aria-hidden="true" />
          </SheetClose>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CreateClassForm onCancel={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
