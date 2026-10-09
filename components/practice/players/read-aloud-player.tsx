"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChunkedPassage } from "@/components/practice/chunked-passage";
import { SpeakingRecorderPlayer } from "@/components/practice/speaking-recorder";
import { SpeakingReview } from "@/components/practice/review/speaking-review";
import { ScoreResultBanner } from "@/components/practice/review/score-result-banner";
import { useSpeakingGrading } from "@/components/practice/use-speaking-grading";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts, voiceLabel } from "@/lib/wfd-tts-client";
import { PTE_VOICE_POOL } from "@/lib/azure-tts";

const SAMPLE_SPEEDS = [0.75, 0.9, 1, 1.1, 1.25];

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
  const [samplePlaying, setSamplePlaying] = useState(false);
  const [sampleVoice, setSampleVoice] = useState("en-AU-NatashaNeural");
  const [sampleRate, setSampleRate] = useState(1);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopSample = () => {
    sampleAudioRef.current?.pause();
    sampleAudioRef.current = null;
    window.speechSynthesis?.cancel();
    setSamplePlaying(false);
  };

  useEffect(() => stopSample, []);

  const handleSample = async () => {
    if (samplePlaying) {
      stopSample();
      return;
    }
    setSamplePlaying(true);
    const azure = await fetchAzureTts(passage, sampleVoice);
    if (azure) {
      const audio = new Audio(azure.url);
      audio.playbackRate = sampleRate;
      audio.onended = () => setSamplePlaying(false);
      sampleAudioRef.current = audio;
      audio.play().catch(() => setSamplePlaying(false));
      return;
    }
    if (isBrowserTtsSupported()) {
      speakWithBrowserTts(passage, () => setSamplePlaying(false), 0.95 * sampleRate);
      return;
    }
    setSamplePlaying(false);
  };

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
      <div
        className="flex flex-col gap-5 rounded-xl border p-4 sm:p-5"
        style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
      >
        <ChunkedPassage text={passage} embedded />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSample}
            className="flex w-fit items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-normal"
            style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-muted)" }}
          >
            {samplePlaying ? <Square className="size-3.5" /> : <Volume2 className="size-3.5" />}
            {samplePlaying ? "Dừng nghe" : "Nghe bài mẫu"}
          </button>
          <select
            value={sampleVoice}
            onChange={(e) => setSampleVoice(e.target.value)}
            aria-label="Giọng đọc"
            className="rounded-full border px-2.5 py-1.5 text-[13px] outline-none"
            style={{ borderColor: "var(--wfd-border)", background: "var(--wfd-surface)", color: "var(--wfd-muted)" }}
          >
            {PTE_VOICE_POOL.map((v) => (
              <option key={v.name} value={v.name}>
                {voiceLabel(v.name)}
              </option>
            ))}
          </select>
          <select
            value={sampleRate}
            onChange={(e) => {
              const rate = Number(e.target.value);
              setSampleRate(rate);
              if (sampleAudioRef.current) sampleAudioRef.current.playbackRate = rate;
            }}
            aria-label="Tốc độ đọc"
            className="rounded-full border px-2.5 py-1.5 text-[13px] outline-none"
            style={{ borderColor: "var(--wfd-border)", background: "var(--wfd-surface)", color: "var(--wfd-muted)" }}
          >
            {SAMPLE_SPEEDS.map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
        </div>
        <SpeakingRecorderPlayer
          embedded
          spaceShortcut
          prepSeconds={prepSeconds}
          recordSeconds={recordSeconds}
          onRecordingComplete={setRecording}
        />
      </div>
      <Button
        className="w-fit gap-2 self-center bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
        disabled={!recording || isGrading}
        onClick={handleSubmit}
      >
        {isGrading && <Loader2 className="size-4 animate-spin" />}
        {isGrading ? "Đang chấm điểm bằng AI..." : "Nộp bài"}
      </Button>
      {error && <p className="text-center text-[15px] text-destructive">{error}</p>}
    </div>
  );
}
