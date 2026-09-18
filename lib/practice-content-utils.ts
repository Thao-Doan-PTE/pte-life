import type { BlankSegment } from "@/components/practice/dropdown-blanks";

/** Bỏ đáp án đúng khỏi segments trước khi gửi cho client ở Bước A/B (trước khi nộp bài)
 * — tránh lộ đáp án qua props/devtools. Điểm số thật được chấm ở server (submitAttemptAction)
 * bằng cách đọc lại Question gốc từ DB. */
export function stripBlankAnswers(segments: BlankSegment[]): BlankSegment[] {
  return segments.map((s) =>
    s.type === "blank" ? { ...s, correctAnswer: undefined } : s
  );
}
