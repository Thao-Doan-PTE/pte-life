"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SingleAudioPlayer } from "@/components/practice/single-audio-player";
import { HighlightWords } from "@/components/practice/highlight-words";
import { HighlightReview } from "@/components/practice/review/highlight-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { submitAttemptAction } from "@/lib/actions/practice";
import type { ScoreResult } from "@/lib/scoring/types";

export function HighlightWordsPlayer({
  questionId,
  audioUrl,
  words,
}: {
  questionId: string;
  audioUrl: string;
  words: string[];
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [submittedSelection, setSubmittedSelection] = useState<number[] | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const handleSubmit = async () => {
    setSubmittedSelection(selected);
    try {
      const elapsedSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await submitAttemptAction(questionId, selected, elapsedSec);
      setResult(res);
    } catch {
      setError("Không thể chấm điểm, vui lòng thử lại.");
    }
  };

  if (result && submittedSelection) {
    return (
      <div className="flex flex-col gap-4">
        <HighlightReview
          words={words}
          selected={submittedSelection}
          incorrectIndexes={result.reveal.incorrectIndexes as number[]}
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
      <SingleAudioPlayer audioUrl={audioUrl} onEnded={() => setHasPlayed(true)} />
      {hasPlayed && (
        <>
          <p className="text-xs text-muted-foreground">
            Bấm vào những từ trong đoạn dưới đây mà bạn cho là KHÁC với audio
            vừa nghe.
          </p>
          <HighlightWords words={words} onSelectionChange={setSelected} />
          <Button
            className="w-fit self-center bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
            disabled={selected.length === 0}
            onClick={handleSubmit}
          >
            Nộp bài
          </Button>
        </>
      )}
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
