"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BlankSegment } from "@/components/practice/dropdown-blanks";

export function DragDropBlanks({
  segments,
  wordBank,
  onAnswersChange,
}: {
  segments: BlankSegment[];
  wordBank: string[];
  onAnswersChange?: (answers: Record<string, string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const usedWords = new Set(Object.values(answers));
  const availableWords = wordBank.filter((w) => !usedWords.has(w));

  const placeWord = (blankId: string, word: string) => {
    const next = { ...answers, [blankId]: word };
    setAnswers(next);
    setSelectedWord(null);
    onAnswersChange?.(next);
  };

  const clearBlank = (blankId: string) => {
    const next = { ...answers };
    delete next[blankId];
    setAnswers(next);
    onAnswersChange?.(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 rounded-xl border bg-muted/40 p-3">
        {availableWords.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Đã dùng hết từ trong ngân hàng từ.
          </p>
        )}
        {availableWords.map((w) => (
          <button
            key={w}
            type="button"
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", w)}
            onClick={() => setSelectedWord((prev) => (prev === w ? null : w))}
            className={cn(
              "cursor-grab rounded-md border bg-card px-2.5 py-1 text-sm active:cursor-grabbing",
              selectedWord === w && "border-primary bg-primary/10"
            )}
          >
            {w}
          </button>
        ))}
      </div>

      <p className="whitespace-pre-line rounded-xl border bg-card p-4 text-base leading-loose">
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <span key={i}>{seg.value}</span>
          ) : (
            <span
              key={i}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const w = e.dataTransfer.getData("text/plain");
                if (w) placeWord(seg.id!, w);
              }}
              onClick={() => {
                if (answers[seg.id!]) clearBlank(seg.id!);
                else if (selectedWord) placeWord(seg.id!, selectedWord);
              }}
              className={cn(
                "mx-1 inline-flex min-w-[72px] cursor-pointer items-center justify-center rounded-md border border-dashed px-2 py-0.5 text-sm",
                answers[seg.id!]
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/40 text-muted-foreground"
              )}
            >
              {answers[seg.id!] ?? "___"}
            </span>
          )
        )}
      </p>
      <p className="text-xs text-muted-foreground">
        Kéo thả từ trong khung phía trên vào chỗ trống, hoặc bấm chọn 1 từ rồi
        bấm vào chỗ trống muốn điền.
      </p>
    </div>
  );
}
