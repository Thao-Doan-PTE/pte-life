"use client";

import { useRef, useState } from "react";
import { MonitorCheck } from "lucide-react";
import { createQuestionTestSession } from "@/lib/actions/mocktest";

/** Bật công tắc này = chuyển thẳng sang 1 phiên Mock Test thật (nhiều câu liên
 * tiếp, tính giờ, đúng dạng câu đang xem) — dùng lại hệ thống MockTestSession
 * (chế độ "question") đã có sẵn ở /mocktest, không tạo luồng riêng. */
export function ExamSimulationToggle({ questionTypeId }: { questionTypeId: string }) {
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleToggleOn = () => {
    if (pending) return;
    setPending(true);
    formRef.current?.requestSubmit();
  };

  return (
    <div
      className="rounded-2xl border p-4 shadow-sm"
      style={{ borderColor: "var(--wfd-border)", background: "var(--wfd-surface)" }}
    >
      <form ref={formRef} action={createQuestionTestSession} className="hidden">
        <input type="hidden" name="questionTypeId" value={questionTypeId} />
        <input type="hidden" name="randomize" value="false" />
      </form>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: "var(--wfd-ink)" }}>
            <MonitorCheck className="size-4 shrink-0" style={{ color: "#4F46E5" }} />
            Exam Simulation
          </h3>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--wfd-muted)" }}>
            Giao diện thi thật, tính giờ, ẩn mọi công cụ hỗ trợ.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={pending}
          disabled={pending}
          onClick={handleToggleOn}
          className="relative h-6 w-11 shrink-0 rounded-full border-0 p-0 transition-colors disabled:opacity-70"
          style={{ background: pending ? "#4F46E5" : "#cbd5e1" }}
        >
          <span
            className="absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]"
            style={{ left: pending ? "22px" : "2px" }}
          />
        </button>
      </div>
    </div>
  );
}
