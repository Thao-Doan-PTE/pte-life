"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Timer } from "lucide-react";
import { ExamAdvanceProvider, useExamAdvanceHandler } from "@/components/mocktest/exam-advance-context";

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Khung "giao diện thi thật" cho 1 câu trong Mock Test — nhân bản theo đúng
 * mockup Exam Simulation: thanh trên/dưới màu xám đậm, nền trang xám nhạt, ẩn
 * navbar thường, đồng hồ đếm ngược có vòng tròn tiến trình, tự bấm "Next" khi
 * hết giờ (không cần thí sinh tự bấm — đúng chuẩn thi thật). */
export function MockExamShell(props: {
  title: string;
  resetKey: string;
  index: number;
  total: number;
  timerSeconds: number | null;
  advanceAction: (formData: FormData) => void;
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <ExamAdvanceProvider>
      <MockExamShellInner {...props} />
    </ExamAdvanceProvider>
  );
}

function MockExamShellInner({
  title,
  resetKey,
  index,
  total,
  timerSeconds,
  advanceAction,
  isLast,
  children,
}: {
  title: string;
  resetKey: string;
  index: number;
  total: number;
  timerSeconds: number | null;
  advanceAction: (formData: FormData) => void;
  isLast: boolean;
  children: React.ReactNode;
}) {
  const [remaining, setRemaining] = useState(timerSeconds ?? 0);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const getBeforeAdvance = useExamAdvanceHandler();

  const runAdvance = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const beforeAdvance = getBeforeAdvance();
    if (beforeAdvance) {
      setIsAdvancing(true);
      try {
        await beforeAdvance();
      } finally {
        setIsAdvancing(false);
      }
    }
    formRef.current?.requestSubmit();
  };

  useEffect(() => {
    submittedRef.current = false;
    const id = setTimeout(() => setRemaining(timerSeconds ?? 0), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    if (timerSeconds === null) return;
    if (remaining <= 0) {
      if (!submittedRef.current) runAdvance();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, timerSeconds]);

  const progress = timerSeconds && timerSeconds > 0 ? remaining / timerSeconds : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <div className="wfd-theme min-h-svh">
    <div className="wfd-force-light min-h-svh" style={{ background: "#ECECEC", color: "#3A3A3A" }}>
      <div
        className="flex h-14 items-center justify-between px-4 text-white sm:px-6"
        style={{ background: "#5B5B5B" }}
      >
        <div className="text-sm font-semibold tracking-wide">{title}</div>
        <div className="flex items-center gap-5">
          <span className="hidden text-xs text-neutral-200 sm:inline">
            {index} of {total}
          </span>
          {timerSeconds !== null && (
            <div className="flex items-center gap-3 rounded bg-neutral-100 px-3 py-1">
              <div className="text-right">
                <div className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
                  Time remaining
                </div>
                <div
                  className="wfd-mono text-xl font-bold text-red-600 tabular-nums"
                  role="timer"
                  aria-live="off"
                >
                  {formatMmSs(remaining)}
                </div>
              </div>
              <div className="relative size-9 shrink-0">
                <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
                  <circle cx="18" cy="18" r={RING_RADIUS} className="fill-none stroke-neutral-300" strokeWidth={4} />
                  <circle
                    cx="18"
                    cy="18"
                    r={RING_RADIUS}
                    className="fill-none stroke-red-600 transition-[stroke-dashoffset] duration-300"
                    strokeWidth={4}
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <Timer className="absolute inset-0 m-auto size-3.5 text-neutral-500" />
              </div>
            </div>
          )}
        </div>
      </div>

      <form ref={formRef} action={advanceAction}>
        <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:px-6">{children}</div>

        <footer
          className="fixed inset-x-0 bottom-0 flex h-14 items-center justify-between px-4 sm:px-6"
          style={{ background: "#5B5B5B" }}
        >
          <Link
            href="/mocktest"
            className="text-xs text-neutral-300 underline-offset-2 hover:text-white hover:underline"
          >
            Thoát chế độ thi
          </Link>
          <button
            type="button"
            onClick={runAdvance}
            disabled={isAdvancing}
            className="flex items-center gap-1.5 rounded-sm bg-neutral-100 px-6 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-white disabled:opacity-70"
          >
            {isAdvancing && <Loader2 className="size-3.5 animate-spin" />}
            {isAdvancing ? "Đang chấm điểm..." : isLast ? "Kết thúc" : "Next"}
          </button>
        </footer>
      </form>
    </div>
    </div>
  );
}
