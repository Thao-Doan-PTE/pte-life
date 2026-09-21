"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SingleAudioPlayer } from "@/components/practice/single-audio-player";
import { TtsAudioPlayer } from "@/components/practice/tts-audio-player";
import { SpeakingRecorderPlayer } from "@/components/practice/speaking-recorder";
import { SpeakingReview } from "@/components/practice/review/speaking-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { useSpeakingGrading } from "@/components/practice/use-speaking-grading";
import { playBeep } from "@/lib/beep";

const DEMO_COUNTDOWN_SECONDS = 3;

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
  const [countdown, setCountdown] = useState(DEMO_COUNTDOWN_SECONDS);
  const [ready, setReady] = useState(false);
  const { recording, setRecording, isGrading, result, error, handleSubmit } =
    useSpeakingGrading(questionId);

  // Đếm ngược chuẩn bị rồi phát câu luôn, không có tiếng báo hiệu ở giữa.
  useEffect(() => {
    if (countdown <= 0) {
      const id = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // Nghe xong câu -> phát tiếng beep -> mic tự bật ghi âm, không cần bấm nút.
  const handleAudioEnded = () => {
    playBeep();
    setCanRecord(true);
  };

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
      {!ready && (
        <span className="w-fit text-sm font-bold" style={{ color: "var(--wfd-ink)" }}>
          {`Prepare: 00:${String(countdown).padStart(2, "0")}`}
        </span>
      )}
      {ready && !canRecord && (
        <span className="w-fit text-sm font-bold" style={{ color: "var(--wfd-ink)" }}>
          Hãy lắng nghe cẩn thận — bạn sẽ nghe thấy câu này 1 lần.
        </span>
      )}
      {audioUrl ? (
        <SingleAudioPlayer audioUrl={audioUrl} autoPlay={ready} onEnded={handleAudioEnded} />
      ) : (
        <TtsAudioPlayer text={ttsText!} autoPlay={ready} onEnded={handleAudioEnded} />
      )}
      {canRecord && (
        <>
          <SpeakingRecorderPlayer
            autoStart={canRecord}
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
        </>
      )}
    </div>
  );
}
