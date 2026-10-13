"use client";

import { useActionState } from "react";
import { Play } from "lucide-react";
import { startAssignmentMockAction } from "@/lib/actions/mocktest";

/** Nút "Làm Mock test" của bài tập dạng Mock test. Thành công thì server chuyển
 * thẳng sang lượt thi; lỗi (bài đã đóng…) hiện ngay dưới nút. */
export function StartMockButton({ assignmentId, title }: { assignmentId: string; title: string }) {
  const [state, formAction, pending] = useActionState<{ error: string } | null, FormData>(
    async () => startAssignmentMockAction(assignmentId),
    null
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <button
        type="submit"
        disabled={pending}
        aria-label={`Làm Mock test: ${title}`}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--rail-red)] px-4 text-[15px] font-bold text-[var(--rail-cta-text)] transition-colors hover:bg-[var(--rail-red-hover)] disabled:cursor-wait disabled:opacity-70"
      >
        <Play className="size-3.5" fill="currentColor" aria-hidden="true" />
        {pending ? "Đang mở đề…" : "Làm Mock test"}
      </button>
      {state?.error && (
        <p role="alert" className="m-0 text-[13px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
