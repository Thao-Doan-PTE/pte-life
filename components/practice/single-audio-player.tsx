"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function SingleAudioPlayer({
  audioUrl,
  autoPlay = true,
  onEnded,
}: {
  audioUrl: string;
  /** false để hiện sẵn khung phát (không tách trang) nhưng chưa tự phát —
   * dùng trong lúc đếm ngược "Prepare" ở component cha. */
  autoPlay?: boolean;
  onEnded?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handlePlay = () => {
    if (isPlaying) return;
    audioRef.current?.play();
    setIsPlaying(true);
  };

  const handleMuteToggle = () => {
    const next = !muted;
    setMuted(next);
    if (audioRef.current) audioRef.current.muted = next;
  };

  // Tự động phát ngay khi được phép (autoPlay=true, sau khi hết đếm ngược
  // "Prepare" ở component cha) — không cần bấm nút.
  // Trì hoãn 1 tick để tránh gọi setState đồng bộ ngay trong thân effect.
  useEffect(() => {
    if (!autoPlay) return;
    const id = setTimeout(() => handlePlay(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, autoPlay]);

  const stateLabel = isPlaying ? "Đang phát" : hasPlayed ? "Nghe lại" : "Phát";

  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setHasPlayed(true);
          onEnded?.();
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          disabled={isPlaying}
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
          value={currentTime}
          className="h-1.5 min-w-[80px] flex-1 accent-[var(--wfd-red)]"
        />

        <span className="wfd-mono shrink-0 text-[13px] font-semibold" style={{ color: "var(--wfd-muted)" }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <button
          type="button"
          onClick={handleMuteToggle}
          className="flex shrink-0 items-center rounded-full border px-2 py-1"
          style={{ borderColor: "var(--wfd-border)" }}
        >
          {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
      </div>

      <p className="mt-2 text-[13px] font-bold" style={{ color: "var(--wfd-red-dark)" }}>
        {stateLabel}
      </p>
    </div>
  );
}
