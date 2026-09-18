"use client";

import { useRef, useState } from "react";
import { Play, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SingleAudioPlayer({
  audioUrl,
  onEnded,
  label = "Nghe",
}: {
  audioUrl: string;
  onEnded?: () => void;
  label?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    if (hasPlayed) return;
    audioRef.current?.play();
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-6">
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => {
          setIsPlaying(false);
          setHasPlayed(true);
          onEnded?.();
        }}
      />
      <Button
        size="lg"
        className="gap-2 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
        onClick={handlePlay}
        disabled={hasPlayed || isPlaying}
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
        Chỉ được nghe 1 lần, đúng luật thi thật.
      </p>
    </div>
  );
}
