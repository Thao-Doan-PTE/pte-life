"use client";

import { SpeakingRecorderPlayer, type RecordingResult } from "@/components/practice/speaking-recorder";
import { useSpeakingGrading } from "@/components/practice/use-speaking-grading";
import { useRegisterBeforeAdvance } from "@/components/mocktest/exam-advance-context";

/** Dùng chung cho các dạng đọc/nhìn-rồi-nói (không cần nghe trước): Read
 * Aloud, Describe Image, Respond to Situation — hiện đoạn văn/ảnh/tình huống,
 * học viên tự bấm ghi âm sau thời gian chuẩn bị, AI tự chấm điểm ngay trước
 * khi "Next" chuyển câu, không có nút Nộp bài riêng. */
export function ExamSpeakingManualPlayer({
  questionId,
  instructionText,
  passageText,
  imageUrl,
  situationText,
  prepSeconds,
  recordSeconds,
}: {
  questionId: string;
  instructionText: string;
  passageText?: string;
  imageUrl?: string;
  situationText?: string;
  prepSeconds: number;
  recordSeconds: number;
}) {
  const { recording, setRecording, handleSubmit } = useSpeakingGrading(questionId);

  useRegisterBeforeAdvance(
    recording
      ? async () => {
          await handleSubmit();
        }
      : null
  );

  const handleRecordingComplete = (result: RecordingResult) => {
    setRecording(result);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-neutral-800">{instructionText}</p>

      {passageText && (
        <p className="font-passage rounded border border-neutral-300 bg-white p-4 text-sm leading-loose whitespace-pre-line text-neutral-800">
          {passageText}
        </p>
      )}

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Đề bài"
          className="max-h-[320px] w-full rounded border border-neutral-300 bg-white object-contain p-2"
        />
      )}

      {situationText && (
        <p className="rounded border border-neutral-300 bg-white p-4 text-sm leading-relaxed text-neutral-800">
          {situationText}
        </p>
      )}

      <SpeakingRecorderPlayer
        prepSeconds={prepSeconds}
        recordSeconds={recordSeconds}
        onRecordingComplete={handleRecordingComplete}
      />

      {recording && (
        <p className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
          Your recording has been saved. Click <span className="font-semibold">Next</span> to continue.
        </p>
      )}
    </div>
  );
}
