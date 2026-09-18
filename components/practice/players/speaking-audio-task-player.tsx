"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SingleAudioPlayer } from "@/components/practice/single-audio-player";
import { TtsAudioPlayer } from "@/components/practice/tts-audio-player";
import { SpeakingRecorderPlayer } from "@/components/practice/speaking-recorder";
import { SpeakingReview } from "@/components/practice/review/speaking-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { useSpeakingGrading } from "@/components/practice/use-speaking-grading";

/** Dùng chung cho các dạng Speaking phải nghe audio trước rồi mới ghi âm trả lời:
 * Repeat Sentence, Retell Lecture, Answer Short Question, Summarize Group Discussion.
 * Truyền `audioUrl` để phát file đã upload, hoặc `ttsText` để phát bằng text-to-speech
 * (không cần upload audio) — chỉ cần đúng 1 trong 2. */
export function SpeakingAudioTaskPlayer({
  questionId,
  audioUrl,
  ttsText,
  prepSeconds,
  recordSeconds,
}: {
  questionId: string;
  audioUrl?: string;
  ttsText?: string;
  prepSeconds: number;
  recordSeconds: number;
}) {
  const [canRecord, setCanRecord] = useState(false);
  const { recording, setRecording, isGrading, result, error, handleSubmit } =
    useSpeakingGrading(questionId);

  if (result && recording) {
    return (
      <div className="flex flex-col gap-4">
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
      {audioUrl ? (
        <SingleAudioPlayer audioUrl={audioUrl} onEnded={() => setCanRecord(true)} />
      ) : (
        <TtsAudioPlayer text={ttsText!} onEnded={() => setCanRecord(true)} />
      )}
      {canRecord && (
        <SpeakingRecorderPlayer
          prepSeconds={prepSeconds}
          recordSeconds={recordSeconds}
          onRecordingComplete={setRecording}
        />
      )}
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
