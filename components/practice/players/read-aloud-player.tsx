"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChunkedPassage } from "@/components/practice/chunked-passage";
import { SpeakingRecorderPlayer } from "@/components/practice/speaking-recorder";
import { SpeakingReview } from "@/components/practice/review/speaking-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { useSpeakingGrading } from "@/components/practice/use-speaking-grading";

export function ReadAloudPlayer({
  questionId,
  passage,
  prepSeconds,
  recordSeconds,
}: {
  questionId: string;
  passage: string;
  prepSeconds: number;
  recordSeconds: number;
}) {
  const { recording, setRecording, isGrading, result, error, handleSubmit } =
    useSpeakingGrading(questionId);

  if (result && recording) {
    return (
      <div className="flex flex-col gap-4">
        <ChunkedPassage text={passage} />
        <SpeakingReview
          transcript={recording.transcript}
          wordsPerMinute={result.wordsPerMinute}
          fillerWordCount={result.fillerWordCount}
          grade={result.grade}
        />
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
      <ChunkedPassage text={passage} />
      <SpeakingRecorderPlayer
        prepSeconds={prepSeconds}
        recordSeconds={recordSeconds}
        onRecordingComplete={setRecording}
      />
      <Button
        className="w-fit gap-2 self-center bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
        disabled={!recording || isGrading}
        onClick={handleSubmit}
      >
        {isGrading && <Loader2 className="size-4 animate-spin" />}
        {isGrading ? "Đang chấm điểm bằng AI..." : "Nộp bài"}
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
    </div>
  );
}
