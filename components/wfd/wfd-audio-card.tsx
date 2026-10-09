"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX, TriangleAlert, SlidersHorizontal } from "lucide-react";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts, voiceLabel } from "@/lib/wfd-tts-client";
import { PTE_VOICE_POOL } from "@/lib/azure-tts";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];

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
  const [muted, setMuted] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const optionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!optionsOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [optionsOpen]);

  const resolvedVoiceRef = useRef<string | null>(null);
  const handlePlayRef = useRef<() => void>(() => {});

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
      audio.muted = muted;
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

  useEffect(() => {
    handlePlayRef.current = handlePlay;
  });

  // Phím tắt Space = phát/nghe lại câu — bỏ qua khi học viên đang gõ trong ô
  // nhập/textarea/select khác trên trang, tránh chặn thao tác gõ chữ bình thường.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      e.preventDefault();
      handlePlayRef.current();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  };

  const stateLabel = isPlaying ? "Đang phát" : hasPlayed ? "Nghe lại" : "Phát";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={isPlaying || unsupported}
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-60"
          style={{ background: "var(--wfd-red)" }}
        >
          {hasPlayed ? (
            <RotateCcw className="size-4" />
          ) : (
            <Play className="size-4 translate-x-[1px]" fill="currentColor" />
          )}
        </button>

        <input
          type="range"
          disabled
          min={0}
          max={duration || 0}
          step={0.1}
          value={elapsed}
          className="h-1.5 min-w-[36px] flex-1 accent-[var(--wfd-red)]"
        />

        <span className="wfd-mono shrink-0 text-[13px] font-semibold" style={{ color: "var(--wfd-muted)" }}>
          {formatTime(elapsed)} / {formatTime(duration)}
        </span>

        <button
          type="button"
          onClick={handleMuteToggle}
          className="flex shrink-0 items-center rounded-full border px-2 py-1"
          style={{ borderColor: "var(--wfd-border)" }}
        >
          {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>

        <div ref={optionsRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOptionsOpen((v) => !v)}
            className="flex items-center rounded-full border px-2 py-1"
            style={{
              borderColor: optionsOpen ? "var(--wfd-red)" : "var(--wfd-border)",
              color: optionsOpen ? "var(--wfd-red)" : "var(--wfd-muted)",
            }}
          >
            <SlidersHorizontal className="size-3.5" />
          </button>

          {optionsOpen && (
            <div
              className="absolute top-full right-0 z-10 mt-2 flex w-56 flex-col gap-3 rounded-xl border p-3 shadow-lg"
              style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
            >
              <label className="flex flex-col gap-1 text-[13px] font-semibold" style={{ color: "var(--wfd-muted)" }}>
                Tốc độ
                <select
                  className="wfd-mono rounded-lg border px-2 py-1.5 font-semibold"
                  style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)", background: "var(--wfd-surface)" }}
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  disabled={isPlaying}
                >
                  {SPEED_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      X{r.toFixed(1)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[13px] font-semibold" style={{ color: "var(--wfd-muted)" }}>
                Giọng đọc
                <select
                  className="wfd-mono rounded-lg border px-2 py-1.5 font-semibold"
                  style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)", background: "var(--wfd-surface)" }}
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
            </div>
          )}
        </div>
      </div>

      <p className="mt-2 text-[13px] font-bold" style={{ color: "var(--wfd-red-dark)" }}>
        {stateLabel}
        {!voiceOverride && voiceName && (
          <span className="wfd-mono ml-1.5 font-semibold" style={{ color: "var(--wfd-muted-2)" }}>
            · {voiceLabel(voiceName)}
          </span>
        )}
      </p>

      {unsupported && (
        <p
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold"
          style={{ background: "var(--wfd-red-tint)", color: "var(--wfd-red-dark)" }}
        >
          <TriangleAlert className="size-3.5 shrink-0" />
          Trình duyệt không hỗ trợ đọc văn bản tự động
        </p>
      )}
    </div>
  );
}
