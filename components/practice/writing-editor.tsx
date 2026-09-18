"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WritingEditor({
  minWords,
  maxWords,
  timeLimitSeconds,
  disabled = false,
  onTextChange,
}: {
  minWords: number;
  maxWords: number;
  timeLimitSeconds: number;
  disabled?: boolean;
  onTextChange?: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const wordCount = countWords(text);
  const isUnderMin = wordCount > 0 && wordCount < minWords;
  const isOverMax = wordCount > maxWords;
  const isTimeWarning = secondsLeft <= 60 && secondsLeft > 0;
  const isTimeUp = secondsLeft === 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span
          className={
            isTimeUp
              ? "font-semibold text-destructive"
              : isTimeWarning
                ? "font-semibold text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
          }
        >
          Thời gian còn lại: {formatTime(secondsLeft)}
        </span>
        <span
          className={
            isUnderMin || isOverMax
              ? "font-medium text-destructive"
              : "text-muted-foreground"
          }
        >
          {wordCount} từ (yêu cầu {minWords}–{maxWords})
        </span>
      </div>
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onTextChange?.(e.target.value);
        }}
        disabled={isTimeUp || disabled}
        placeholder="Nhập bài viết của bạn tại đây..."
        className="min-h-[280px] resize-y"
      />
      {isTimeUp && (
        <p className="text-sm text-destructive">
          Đã hết thời gian làm bài. Bạn vẫn có thể nộp bài hiện tại.
        </p>
      )}
    </div>
  );
}
