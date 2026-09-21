"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, RotateCcw } from "lucide-react";

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

  const handlePlay = () => {
    if (isPlaying) return;
    audioRef.current?.play();
    setIsPlaying(true);
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

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-xl border p-6"
      style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => {
          setIsPlaying(false);
          setHasPlayed(true);
          onEnded?.();
        }}
      />
      <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--wfd-muted)" }}>
        <Volume2 className="size-4" />
        {isPlaying ? "Đang phát câu hỏi..." : hasPlayed ? "Đã nghe xong" : "Chuẩn bị phát câu hỏi..."}
      </p>
      <button
        type="button"
        onClick={handlePlay}
        disabled={isPlaying || !hasPlayed}
        className="flex items-center gap-1.5 rounded-[10px] border px-4 py-2 text-sm font-bold disabled:opacity-50"
        style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
      >
        <RotateCcw className="size-4" /> Nghe lại câu
      </button>
      {isPlaying && (
        <p className="text-xs" style={{ color: "var(--wfd-muted-2)" }}>
          Đang phát câu… hãy lắng nghe cẩn thận.
        </p>
      )}
    </div>
  );
}
