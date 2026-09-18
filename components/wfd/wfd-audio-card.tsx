"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Check, TriangleAlert } from "lucide-react";
import { WfdWaveform } from "@/components/wfd/wfd-waveform";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts } from "@/lib/wfd-tts-client";

function estimateDurationSec(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2, Math.round(words * 0.45 + 0.6));
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function WfdAudioCard({
  sentence,
  questionId,
  onPlayed,
}: {
  sentence: string;
  questionId: string;
  onPlayed: () => void;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(() => estimateDurationSec(sentence));
  const [unsupported, setUnsupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handlePlay = async () => {
    if (hasPlayed || isPlaying) return;
    setIsPlaying(true);

    const azure = await fetchAzureTts(sentence);
    if (azure) {
      const audio = new Audio(azure.url);
      audioRef.current = audio;
      audio.onloadedmetadata = () => setDuration(audio.duration || estimateDurationSec(sentence));
      audio.ontimeupdate = () => setElapsed(audio.currentTime);
      audio.onended = () => {
        setIsPlaying(false);
        setHasPlayed(true);
        onPlayed();
      };
      audio.onerror = () => {
        setIsPlaying(false);
        setUnsupported(true);
      };
      audio.play();
      return;
    }

    if (!isBrowserTtsSupported()) {
      setIsPlaying(false);
      setUnsupported(true);
      return;
    }

    function tick() {
      const secs = (Date.now() - startRef.current) / 1000;
      setElapsed(Math.min(secs, duration));
      if (secs < duration) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
    speakWithBrowserTts(sentence, () => {
      setIsPlaying(false);
      setHasPlayed(true);
      setElapsed(duration);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      onPlayed();
    });
  };

  const progressRatio = duration > 0 ? elapsed / duration : 0;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
    >
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            onClick={handlePlay}
            disabled={hasPlayed || isPlaying || unsupported}
            className="flex size-[60px] items-center justify-center rounded-full text-white disabled:opacity-60"
            style={{ background: "var(--wfd-red)" }}
          >
            {hasPlayed ? (
              <Check className="size-6" />
            ) : (
              <Play className="size-6 translate-x-[1px]" fill="currentColor" />
            )}
          </button>
          <span className="text-[11px] font-bold" style={{ color: "var(--wfd-red-dark)" }}>
            {isPlaying ? "Đang phát" : hasPlayed ? "Đã phát" : "Phát"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <WfdWaveform seed={questionId} progress={progressRatio} />
          <p className="wfd-mono mt-1 text-xs font-semibold" style={{ color: "var(--wfd-muted)" }}>
            {formatTime(elapsed)} / {formatTime(duration)}
          </p>
        </div>
      </div>
      <p
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
        style={{ background: "var(--wfd-red-tint)", color: "var(--wfd-red-dark)" }}
      >
        <TriangleAlert className="size-3.5 shrink-0" />
        {unsupported
          ? "Trình duyệt không hỗ trợ đọc văn bản tự động"
          : "Lắng nghe cẩn thận - Bạn chỉ được nghe 1 lần"}
      </p>
    </div>
  );
}
