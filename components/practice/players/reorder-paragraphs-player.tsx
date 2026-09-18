"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ReorderParagraphs, type ParagraphItem } from "@/components/practice/reorder-paragraphs";
import { ReorderReview } from "@/components/practice/review/reorder-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { submitAttemptAction } from "@/lib/actions/practice";
import type { ScoreResult } from "@/lib/scoring/types";

export function ReorderParagraphsPlayer({
  questionId,
  paragraphs,
}: {
  questionId: string;
  paragraphs: ParagraphItem[];
}) {
  const [order, setOrder] = useState(paragraphs);
  const [submittedOrder, setSubmittedOrder] = useState<ParagraphItem[] | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const handleSubmit = async () => {
    setSubmittedOrder(order);
    try {
      const elapsedSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await submitAttemptAction(
        questionId,
        order.map((p) => p.id),
        elapsedSec
      );
      setResult(res);
    } catch {
      setError("Không thể chấm điểm, vui lòng thử lại.");
    }
  };

  if (result && submittedOrder) {
    return (
      <div className="flex flex-col gap-4">
        <ReorderReview
          userOrder={submittedOrder}
          correctOrder={result.reveal.correctOrder as string[]}
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
      <ReorderParagraphs initialOrder={paragraphs} onOrderChange={setOrder} />
      <Button
        className="w-fit self-center bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
        onClick={handleSubmit}
      >
        Nộp bài
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
