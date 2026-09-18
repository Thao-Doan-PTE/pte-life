"use client";

import { useEffect, useRef, useState } from "react";
import { SingleAudioPlayer } from "@/components/practice/single-audio-player";
import { ChoiceQuestion } from "@/components/practice/choice-question";
import { ChoiceReview } from "@/components/practice/review/choice-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { submitAttemptAction } from "@/lib/actions/practice";
import type { ScoreResult } from "@/lib/scoring/types";

/** Dùng chung cho các dạng "nghe rồi chọn đáp án": Multiple Choice (Single/Multiple
 * Answer), Highlight Correct Summary, Select Missing Word. */
export function ListeningChoicePlayer({
  questionId,
  audioUrl,
  question,
  options,
  maxSelectable = 1,
}: {
  questionId: string;
  audioUrl: string;
  question: string;
  options: string[];
  maxSelectable?: number;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
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
    <div className="flex flex-col gap-4">
      <SingleAudioPlayer audioUrl={audioUrl} onEnded={() => setHasPlayed(true)} />
      {hasPlayed && (
        <ChoiceQuestion
          question={question}
          options={options}
          maxSelectable={maxSelectable}
          onSubmit={handleSubmit}
        />
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
