"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TtsPlayer({
  text,
  onEnded,
  label = "Nghe",
}: {
  text: string;
  onEnded?: () => void;
  label?: string;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [unsupported] = useState(
    () => typeof window === "undefined" || !("speechSynthesis" in window)
  );
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  const handlePlay = () => {
    if (hasPlayed || unsupported) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => {
      setIsPlaying(false);
      setHasPlayed(true);
      onEnded?.();
    };
    utteranceRef.current = utterance;
    setIsPlaying(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6">
      <Button
        size="lg"
        className="gap-2 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
        onClick={handlePlay}
        disabled={hasPlayed || isPlaying || unsupported}
      >
        {hasPlayed ? (
          <>
            <Check className="size-4" /> Đã nghe
          </>
        ) : (
          <>
            <Play className="size-4" /> {isPlaying ? "Đang phát..." : label}
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">
        {unsupported
          ? "Trình duyệt của bạn không hỗ trợ đọc văn bản tự động. Vui lòng dùng Chrome/Edge/Safari mới nhất."
          : "Chỉ được nghe 1 lần, đúng luật thi thật."}
      </p>
    </div>
  );
}
