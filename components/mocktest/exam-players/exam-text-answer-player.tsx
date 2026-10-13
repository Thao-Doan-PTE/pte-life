"use client";

import { useMemo, useState } from "react";
import { ExamAudioBar } from "@/components/mocktest/exam-audio-bar";
import { useRegisterBeforeAdvance } from "@/components/mocktest/exam-advance-context";
import { submitWritingAttemptAction } from "@/lib/actions/writing";
import { countWords } from "@/lib/scoring/writing-form";

/** Dùng chung cho các dạng gõ chữ tự do sau khi đọc/nghe, đều chấm bằng AI
 * (không phải rule-based): Write Essay, Summarize Written Text, Summarize
 * Spoken Text — đúng chuẩn thi thật: đoạn văn/audio thuần, ô nhập trơn + đếm
 * từ, không có nút Nộp bài riêng — AI tự chấm ngay trước khi "Next" chuyển
 * câu (không hiện điểm ngay như luyện tập). */
export function ExamTextAnswerPlayer({
  questionId,
  instructionText,
  passageText,
  audioUrl,
  mockSessionId,
}: {
  questionId: string;
  instructionText: string;
  passageText?: string;
  audioUrl?: string;
  /** Lượt Mock test đang làm — để bài viết gắn đúng bài tập của lượt thi (server kiểm tra lại). */
  mockSessionId?: string;
}) {
  const [hasPlayed, setHasPlayed] = useState(!audioUrl);
  const [answer, setAnswer] = useState("");
  // Cùng bộ đếm với kiểm tra Form phía server để số từ hiển thị khớp với số từ được chấm.
  const wordCount = useMemo(() => countWords(answer), [answer]);

  useRegisterBeforeAdvance(
    answer.trim().length > 0
      ? async () => {
          await submitWritingAttemptAction(questionId, answer, 0, mockSessionId);
        }
      : null
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-neutral-800">{instructionText}</p>

      {passageText && (
        <p className="font-passage rounded border border-neutral-300 bg-white p-4 text-sm leading-loose whitespace-pre-line text-neutral-800">
          {passageText}
        </p>
      )}

      {audioUrl && <ExamAudioBar audioUrl={audioUrl} onEnded={() => setHasPlayed(true)} />}

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={!hasPlayed}
        className="min-h-[160px] w-full resize-y rounded border border-neutral-300 bg-white p-3 text-sm outline-none disabled:bg-neutral-100"
      />

      <p className="text-sm text-neutral-500">Word count: {wordCount}</p>

      <p className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
        Your response has been saved. Click <span className="font-semibold">Next</span> to continue.
      </p>
    </div>
  );
}
