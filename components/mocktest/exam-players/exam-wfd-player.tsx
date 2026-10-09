"use client";

import { useMemo, useState } from "react";
import { ExamAudioBar } from "@/components/mocktest/exam-audio-bar";

/** Write from Dictation trong chế độ Exam Simulation — khớp đúng giao diện
 * thi thật Pearson: câu hướng dẫn thuần, thanh audio tự phát 1 lần, ô nhập
 * trơn + đếm số từ, KHÔNG có nút "Nộp bài" riêng — nút "Next" ở footer
 * (MockExamShell) vừa lưu câu trả lời (field "answer") vừa chuyển câu. */
export function ExamWfdPlayer({ sentence }: { sentence: string }) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [answer, setAnswer] = useState("");
  const wordCount = useMemo(
    () => (answer.trim().length === 0 ? 0 : answer.trim().split(/\s+/).length),
    [answer]
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-neutral-800">
        You will hear a sentence. Type the sentence in the box below exactly as you hear it.
        Write as much of the sentence as you can. You will hear the sentence only once.
      </p>

      <ExamAudioBar ttsText={sentence} onEnded={() => setHasPlayed(true)} />

      <textarea
        name="answer"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={!hasPlayed}
        className="font-passage min-h-[80px] w-full resize-y rounded border border-neutral-300 bg-white p-3 text-sm leading-relaxed outline-none disabled:bg-neutral-100"
      />

      <p className="text-sm text-neutral-500">Word count: {wordCount}</p>

      <p className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
        Your response has been saved. Click <span className="font-semibold">Next</span> to continue.
      </p>
    </div>
  );
}
