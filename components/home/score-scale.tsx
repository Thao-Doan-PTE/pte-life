"use client";

import { useState } from "react";

const SCALE_MIN = 10;
const SCALE_MAX = 90;
const SCALE_TICKS = [10, 30, 50, 70, 90];

const EXAMS = [
  { key: "academic", label: "PTE Academic", target: 58, color: "var(--rail-red)" },
  { key: "core", label: "PTE Core", target: 58, color: "var(--rail-warning)" },
] as const;

export function ScoreScale() {
  const [examKey, setExamKey] = useState<(typeof EXAMS)[number]["key"]>("academic");
  const exam = EXAMS.find((e) => e.key === examKey) ?? EXAMS[0];
  const pct = ((exam.target - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;

  return (
    <div
      className="mb-6 max-w-[460px] rounded-xl p-4"
      style={{ background: "var(--rail-bg)", boxShadow: "0 12px 30px -16px rgba(51,51,51,.35)" }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[14px]">
        <div className="flex items-center gap-1" role="tablist" aria-label="Chọn kỳ thi">
          {EXAMS.map((e) => {
            const active = e.key === examKey;
            return (
              <button
                key={e.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setExamKey(e.key)}
                className="rounded-md px-2.5 py-1 font-semibold transition-colors"
                style={{ background: e.color, color: "var(--rail-cta-text)" }}
              >
                {e.label}
              </button>
            );
          })}
        </div>
        <span style={{ color: "var(--rail-ink-dim)" }}>
          Mục tiêu của bạn: <b style={{ color: exam.color }}>{exam.target}+</b>
        </span>
      </div>
      <div
        className="relative mx-2 h-1.5 rounded-full"
        style={{ background: "var(--rail-line)" }}
        role="img"
        aria-label={`Thang điểm ${exam.label} từ ${SCALE_MIN} đến ${SCALE_MAX}, mục tiêu ${exam.target}`}
      >
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: exam.color }} />
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${pct}%`, background: "var(--rail-bg)", border: `2px solid ${exam.color}` }}
        />
      </div>
      <div className="mx-2 mt-4 flex justify-between text-xs" style={{ color: "var(--rail-ink-dim)" }}>
        {SCALE_TICKS.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </div>
  );
}
