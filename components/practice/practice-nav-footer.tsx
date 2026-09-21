"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

/** Bọc quanh player + thanh điều hướng cuối trang cho 4 dạng Speaking dùng chung
 * SpeakingAudioTaskPlayer — nút "Thử lại" đổi `resetKey` để ép React unmount +
 * mount lại toàn bộ cây player con (children truyền từ Server Component), qua đó
 * reset sạch mọi state nội bộ (đã nghe/đang ghi âm/kết quả) mà không cần lift
 * state hay sửa từng player. */
export function PracticeNavFooter({
  prevHref,
  nextHref,
  children,
}: {
  prevHref: string | null;
  nextHref: string | null;
  children: ReactNode;
}) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <>
      <div key={resetKey}>{children}</div>

      <div className="flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: "var(--wfd-border)" }}>
        {prevHref ? (
          <Link
            href={prevHref}
            className="flex items-center gap-1.5 rounded-[10px] border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
          >
            <ArrowLeft className="size-4" /> Câu trước
          </Link>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setResetKey((k) => k + 1)}
          className="flex items-center gap-1.5 rounded-[10px] border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
        >
          <RotateCcw className="size-4" /> Thử lại
        </button>
        {nextHref ? (
          <Link
            href={nextHref}
            className="flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-sm font-bold text-white"
            style={{ background: "var(--wfd-red)" }}
          >
            Câu tiếp <ArrowRight className="size-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}
