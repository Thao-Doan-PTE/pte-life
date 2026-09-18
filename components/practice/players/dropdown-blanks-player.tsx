"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownBlanks, type BlankSegment } from "@/components/practice/dropdown-blanks";
import { BlanksReview } from "@/components/practice/review/blanks-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { submitAttemptAction } from "@/lib/actions/practice";
import type { ScoreResult } from "@/lib/scoring/types";

export function DropdownBlanksPlayer({
  questionId,
  segments,
}: {
  questionId: string;
  segments: BlankSegment[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, string> | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const totalBlanks = segments.filter((s) => s.type === "blank").length;
  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const handleSubmit = async () => {
    setSubmittedAnswers(answers);
    try {
      const elapsedSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await submitAttemptAction(questionId, answers, elapsedSec);
      setResult(res);
    } catch {
      setError("Không thể chấm điểm, vui lòng thử lại.");
    }
  };

  if (result && submittedAnswers) {
    return (
      <div className="flex flex-col gap-4">
        <BlanksReview
          segments={segments}
          userAnswers={submittedAnswers}
          correctAnswers={result.reveal.correctAnswers as Record<string, string>}
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
    <div className="flex flex-col gap-4">
      <DropdownBlanks segments={segments} onAnswersChange={setAnswers} />
      <Button
        className="w-fit self-center bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
        disabled={Object.keys(answers).length < totalBlanks}
        onClick={handleSubmit}
      >
        Nộp bài
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
