"use client";

import { useState } from "react";
import { Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts } from "@/lib/wfd-tts-client";

/** Phát audio bằng text-to-speech (ưu tiên Azure Neural TTS, fallback giọng đọc
 * máy của trình duyệt) thay vì yêu cầu upload sẵn 1 file audio — dùng cho các
 * dạng câu hỏi mà nguồn phát chỉ là 1 câu ngắn tiếng Anh (vd Repeat Sentence). */
export function TtsAudioPlayer({
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
  const [unsupported, setUnsupported] = useState(false);

  const handlePlay = async () => {
    if (hasPlayed || isPlaying) return;
    setIsPlaying(true);

    const azure = await fetchAzureTts(text);
    if (azure) {
      const audio = new Audio(azure.url);
      audio.onended = () => {
        setIsPlaying(false);
        setHasPlayed(true);
        onEnded?.();
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

    speakWithBrowserTts(text, () => {
      setIsPlaying(false);
      setHasPlayed(true);
      onEnded?.();
    });
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
          ? "Trình duyệt không hỗ trợ đọc văn bản tự động."
          : "Chỉ được nghe 1 lần, đúng luật thi thật."}
      </p>
    </div>
  );
}
