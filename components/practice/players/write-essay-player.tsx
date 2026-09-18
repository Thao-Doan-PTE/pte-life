"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WritingEditor } from "@/components/practice/writing-editor";
import { WritingReview } from "@/components/practice/review/writing-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { submitWritingAttemptAction } from "@/lib/actions/writing";
import type { WritingSubmitResult } from "@/lib/actions/writing";

export function WriteEssayPlayer({
  questionId,
  prompt,
  minWords,
  maxWords,
  timeLimitSeconds,
}: {
  questionId: string;
  prompt: string;
  minWords: number;
  maxWords: number;
  timeLimitSeconds: number;
}) {
  const [text, setText] = useState("");
  const [submittedText, setSubmittedText] = useState<string | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<WritingSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const handleSubmit = async () => {
    setSubmittedText(text);
    setIsGrading(true);
    setError(null);
    try {
      const elapsedSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await submitWritingAttemptAction(questionId, text, elapsedSec);
      setResult(res);
    } catch {
      setError("Không thể chấm điểm bằng AI lúc này, vui lòng thử lại sau.");
      setSubmittedText(null);
    } finally {
      setIsGrading(false);
    }
  };

  if (result && submittedText) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          {prompt}
        </p>
        <WritingReview studentText={submittedText} grade={result.grade} />
        <ScoreResultBanner
          scorePct={result.scorePct}
          pteScore={result.pteScore}
          correct={result.correct}
          method="ai"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl border bg-card p-4 text-sm">{prompt}</p>
      <WritingEditor
        minWords={minWords}
        maxWords={maxWords}
        timeLimitSeconds={timeLimitSeconds}
        disabled={isGrading}
        onTextChange={setText}
      />
      <Button
        className="w-fit self-center gap-2 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
        disabled={isGrading || text.trim().length === 0}
        onClick={handleSubmit}
      >
        {isGrading && <Loader2 className="size-4 animate-spin" />}
        {isGrading ? "Đang chấm điểm bằng AI..." : "Nộp bài"}
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
