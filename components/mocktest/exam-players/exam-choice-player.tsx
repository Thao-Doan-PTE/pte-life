"use client";

import { useState } from "react";
import { ExamAudioBar } from "@/components/mocktest/exam-audio-bar";

/** Dùng chung cho mọi dạng chọn đáp án sau khi đọc/nghe: Reading MCQ (đơn/đa),
 * Listening MCQ (đơn/đa), Select Missing Word, Highlight Correct Summary —
 * đúng chuẩn thi thật: không có nút Nộp bài riêng, chọn xong bấm Next ở
 * footer là lưu (field "answer" mã hoá JSON mảng chỉ số đã chọn). */
export function ExamChoicePlayer({
  instructionText,
  passageText,
  audioUrl,
  question,
  options,
  maxSelectable = 1,
}: {
  instructionText: string;
  passageText?: string;
  audioUrl?: string;
  question: string;
  options: string[];
  maxSelectable?: number;
}) {
  const [hasPlayed, setHasPlayed] = useState(!audioUrl);
  const [selected, setSelected] = useState<number[]>([]);
  const isMultiple = maxSelectable > 1;

  const toggle = (index: number) => {
    if (!hasPlayed) return;
    setSelected((prev) => {
      if (!isMultiple) return [index];
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= maxSelectable) return prev;
      return [...prev, index];
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-neutral-800">{instructionText}</p>

      {passageText && (
        <p className="font-passage rounded border border-neutral-300 bg-white p-4 text-sm leading-loose whitespace-pre-line text-neutral-800">
          {passageText}
        </p>
      )}

      {audioUrl && <ExamAudioBar audioUrl={audioUrl} onEnded={() => setHasPlayed(true)} />}

      <p className="font-passage text-sm font-semibold text-neutral-800">{question}</p>
      {isMultiple && (
        <p className="text-xs text-neutral-500">Chọn tối đa {maxSelectable} đáp án.</p>
      )}

      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const checked = selected.includes(i);
          return (
            <label
              key={i}
              className={`flex items-center gap-3 rounded border px-3 py-2 text-sm ${
                checked ? "border-neutral-700 bg-neutral-100" : "border-neutral-300 bg-white"
              } ${hasPlayed ? "cursor-pointer" : "cursor-default opacity-60"}`}
            >
              <input
                type={isMultiple ? "checkbox" : "radio"}
                name={isMultiple ? undefined : "exam-choice"}
                checked={checked}
                onChange={() => toggle(i)}
                disabled={!hasPlayed}
              />
              {opt}
            </label>
          );
        })}
      </div>

      <input type="hidden" name="answer" value={JSON.stringify(selected)} />

      <p className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
        Your response has been saved. Click <span className="font-semibold">Next</span> to continue.
      </p>
    </div>
  );
}
