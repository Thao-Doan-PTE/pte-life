"use client";

import { useEffect, useRef, useState } from "react";
import { DictationInput } from "@/components/practice/dictation-input";
import { DictationReview } from "@/components/practice/review/dictation-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { submitAttemptAction } from "@/lib/actions/practice";
import type { ScoreResult } from "@/lib/scoring/types";
import type { DictationWordDiff } from "@/lib/scoring/rule-based";

export function DictationPlayer({
  questionId,
  sentence,
}: {
  questionId: string;
  sentence: string;
}) {
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const handleSubmit = async (answer: string) => {
    try {
      const elapsedSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await submitAttemptAction(questionId, answer, elapsedSec);
      setResult(res);
    } catch {
      setError("Không thể chấm điểm, vui lòng thử lại.");
    }
  };

  if (result) {
    return (
      <div className="flex flex-col gap-4">
        <DictationReview diff={result.reveal.diff as DictationWordDiff[]} />
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
      <DictationInput sentence={sentence} onSubmit={handleSubmit} />
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
