"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts } from "@/lib/wfd-tts-client";

type Status = "idle" | "playing" | "completed";

const STATUS_LABEL: Record<Status, string> = {
  idle: "Not started",
  playing: "Playing",
  completed: "Completed",
};

/** Thanh audio tối giản đúng chuẩn thi thật Pearson: tự phát 1 lần khi vào
 * câu, không có nút bấm/tua/nghe lại — chỉ hiện "Status: ..." + thanh tiến
 * trình. Dùng `audioUrl` cho file đã upload, hoặc `ttsText` để đọc bằng TTS
 * (ưu tiên Azure, fallback giọng máy của trình duyệt). */
export function ExamAudioBar({
  audioUrl,
  ttsText,
  onEnded,
}: {
  audioUrl?: string;
  ttsText?: string;
  onEnded: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef(onEnded);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      setStatus("completed");
      setProgress(100);
      onEndedRef.current();
    };

    const playAudio = (audio: HTMLAudioElement) => {
      audioRef.current = audio;
      audio.ontimeupdate = () => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.onended = finish;
      setStatus("playing");
      audio.play().catch(() => {});
    };

    const start = async () => {
      if (audioUrl) {
        playAudio(new Audio(audioUrl));
        return;
      }
      if (!ttsText) return;
      const azure = await fetchAzureTts(ttsText);
      if (cancelled) return;
      if (azure) {
        playAudio(new Audio(azure.url));
        return;
      }
      if (isBrowserTtsSupported()) {
        setStatus("playing");
        setProgress(50);
        speakWithBrowserTts(ttsText, finish);
      }
    };

    const id = setTimeout(start, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded border border-neutral-300 bg-white p-4">
      <div className="flex items-center justify-between text-sm font-semibold text-neutral-800">
        <span>Status: {STATUS_LABEL[status]}</span>
        <Volume2 className="size-4 text-neutral-500" />
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200">
        <div
          className="h-1.5 rounded-full bg-neutral-800 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
