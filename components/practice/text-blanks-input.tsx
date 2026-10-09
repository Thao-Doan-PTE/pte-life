"use client";

import { useState } from "react";
import type { BlankSegment } from "@/components/practice/dropdown-blanks";

export function TextBlanksInput({
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
    <p className="font-passage whitespace-pre-line rounded-xl border bg-card p-4 text-[17px] leading-[1.8]">
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <input
            key={i}
            type="text"
            value={answers[seg.id!] ?? ""}
            onChange={(e) => setAnswer(seg.id!, e.target.value)}
            className="mx-1 w-28 rounded-md border border-input bg-background px-2 py-0.5 text-[15px]"
          />
        )
      )}
    </p>
  );
}
