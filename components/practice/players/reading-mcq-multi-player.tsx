"use client";

import { useEffect, useRef, useState } from "react";
import { ChoiceQuestion } from "@/components/practice/choice-question";
import { ChoiceReview } from "@/components/practice/review/choice-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { submitAttemptAction } from "@/lib/actions/practice";
import type { ScoreResult } from "@/lib/scoring/types";

export function ReadingMcqMultiPlayer({
  questionId,
  passage,
  question,
  options,
  maxSelectable,
}: {
  questionId: string;
  passage: string;
  question: string;
  options: string[];
  maxSelectable: number;
}) {
  const [selected, setSelected] = useState<number[] | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const handleSubmit = async (picked: number[]) => {
    setSelected(picked);
    try {
      const elapsedSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await submitAttemptAction(questionId, picked, elapsedSec);
      setResult(res);
    } catch {
      setError("Không thể chấm điểm, vui lòng thử lại.");
    }
  };

  if (result && selected) {
    return (
      <div className="flex flex-col gap-4">
        <p className="whitespace-pre-line rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          {passage}
        </p>
        <p className="font-medium">{question}</p>
        <ChoiceReview
          options={options}
          selected={selected}
          correctIndexes={result.reveal.correctIndexes as number[]}
        />
        <ScoreResultBanner
          scorePct={result.scorePct}
          pteScore={result.pteScore}
          correct={result.correct}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <ChoiceQuestion
        passage={passage}
        question={question}
        options={options}
        maxSelectable={maxSelectable}
        onSubmit={handleSubmit}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
