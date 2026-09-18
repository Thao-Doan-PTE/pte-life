"use client";

import { useState } from "react";

export interface BlankSegment {
  type: "text" | "blank";
  value?: string;
  id?: string;
  options?: string[];
  correctAnswer?: string;
}

export function DropdownBlanks({
  segments,
  onAnswersChange,
}: {
  segments: BlankSegment[];
  onAnswersChange?: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const setAnswer = (id: string, value: string) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onAnswersChange?.(next);
  };

  return (
    <p className="whitespace-pre-line rounded-xl border bg-card p-4 text-base leading-loose">
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <select
            key={i}
            value={answers[seg.id!] ?? ""}
            onChange={(e) => setAnswer(seg.id!, e.target.value)}
            className="mx-1 rounded-md border border-input bg-background px-2 py-0.5 text-sm"
          >
            <option value="" disabled>
              chọn...
            </option>
            {seg.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )
      )}
    </p>
  );
}
