"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, TriangleAlert } from "lucide-react";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts, voiceLabel } from "@/lib/wfd-tts-client";
import { PTE_VOICE_POOL } from "@/lib/azure-tts";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

function pickerStyle() {
  return {
    background: "transparent",
    color: "var(--wfd-muted)",
    border: "none",
  } as const;
}

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
  onPlayed,
}: {
  sentence: string;
  onPlayed: () => void;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(() => estimateDurationSec(sentence));
  const [unsupported, setUnsupported] = useState(false);
  const [voiceName, setVoiceName] = useState<string | null>(null);
  const [voiceOverride, setVoiceOverride] = useState<string | null>("en-AU-NatashaNeural");
  const [playbackRate, setPlaybackRate] = useState(1);
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

  const resolvedVoiceRef = useRef<string | null>(null);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    setElapsed(0);

    // Ưu tiên giọng học viên tự chọn; nếu để "Ngẫu nhiên" thì giữ nguyên giọng
    // đã xoay ở lần phát đầu cho các lần nghe lại, tận dụng cache server theo
    // (voice::text) thay vì đổi giọng lung tung giữa các lần nghe cùng 1 câu.
    const voiceToUse = voiceOverride ?? resolvedVoiceRef.current ?? undefined;
    const azure = await fetchAzureTts(sentence, voiceToUse);
    if (azure) {
      if (!resolvedVoiceRef.current) resolvedVoiceRef.current = azure.voiceName;
      setVoiceName(azure.voiceName);
      const audio = new Audio(azure.url);
      audio.playbackRate = playbackRate;
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
    speakWithBrowserTts(
      sentence,
      () => {
        setIsPlaying(false);
        setHasPlayed(true);
        setElapsed(duration);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        onPlayed();
      },
      0.95 * playbackRate
    );
  };

  const progressRatio = duration > 0 ? elapsed / duration : 0;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs" style={{ color: "var(--wfd-muted)" }}>
        <label className="flex items-center gap-1">
          Giọng đọc:
          <select
            className="wfd-mono cursor-pointer appearance-none bg-transparent font-semibold underline decoration-dotted"
            style={pickerStyle()}
            value={voiceOverride ?? ""}
            onChange={(e) => setVoiceOverride(e.target.value || null)}
            disabled={isPlaying}
          >
            <option value="">{voiceLabel(null)}</option>
            {PTE_VOICE_POOL.map((v) => (
              <option key={v.name} value={v.name}>
                {voiceLabel(v.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Tốc độ:
          <select
            className="wfd-mono cursor-pointer appearance-none bg-transparent font-semibold underline decoration-dotted"
            style={pickerStyle()}
            value={playbackRate}
            onChange={(e) => setPlaybackRate(Number(e.target.value))}
            disabled={isPlaying}
          >
            {SPEED_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r.toFixed(2)}x
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex shrink-0 flex-col items-center gap-1">
          <button
            type="button"
            onClick={handlePlay}
            disabled={isPlaying || unsupported}
            className="flex size-10 items-center justify-center rounded-full text-white disabled:opacity-60"
            style={{ background: "var(--wfd-red)" }}
          >
            {hasPlayed ? (
              <RotateCcw className="size-4" />
            ) : (
              <Play className="size-4 translate-x-[1px]" fill="currentColor" />
            )}
          </button>
          <span className="text-[11px] font-bold" style={{ color: "var(--wfd-red-dark)" }}>
            {isPlaying ? "Đang phát" : hasPlayed ? "Nghe lại" : "Phát"}
          </span>
          {!voiceOverride && voiceName && (
            <span className="wfd-mono text-[10px]" style={{ color: "var(--wfd-muted-2)" }}>
              {voiceLabel(voiceName)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "var(--wfd-border)" }}
          >
            <div
              className="h-full rounded-full transition-[width]"
              style={{ width: `${progressRatio * 100}%`, background: "var(--wfd-navy)" }}
            />
          </div>
          <p className="wfd-mono mt-1.5 text-xs font-semibold" style={{ color: "var(--wfd-muted)" }}>
            {formatTime(elapsed)} / {formatTime(duration)}
          </p>
        </div>
      </div>
      {unsupported && (
        <p
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold"
          style={{ background: "var(--wfd-red-tint)", color: "var(--wfd-red-dark)" }}
        >
          <TriangleAlert className="size-3.5 shrink-0" />
          Trình duyệt không hỗ trợ đọc văn bản tự động
        </p>
      )}
    </div>
  );
}
