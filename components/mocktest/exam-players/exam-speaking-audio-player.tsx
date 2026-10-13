"use client";

import { useState } from "react";
import { ExamAudioBar } from "@/components/mocktest/exam-audio-bar";
import { SpeakingRecorderPlayer, type RecordingResult } from "@/components/practice/speaking-recorder";
import { useSpeakingGrading } from "@/components/practice/use-speaking-grading";
import { useRegisterBeforeAdvance } from "@/components/mocktest/exam-advance-context";
import { playBeep } from "@/lib/beep";

/** Dùng chung cho các dạng nghe-rồi-nói: Repeat Sentence, Re-tell Lecture,
 * Answer Short Question, Summarize Group Discussion — đúng chuẩn thi thật:
 * nghe xong tự động bíp rồi ghi âm ngay, không có nút Nộp bài — AI tự chấm
 * điểm ngay trước khi "Next" chuyển câu (không hiện điểm ngay như luyện tập). */
export function ExamSpeakingAudioPlayer({
  questionId,
  instructionText,
  audioUrl,
  ttsText,
  prepSeconds,
  recordSeconds,
  collectAudio = false,
  mockSessionId,
}: {
  questionId: string;
  instructionText: string;
  audioUrl?: string;
  ttsText?: string;
  prepSeconds: number;
  recordSeconds: number;
  /** Gửi kèm file ghi âm khi nộp — trang (server) tính, xem useSpeakingGrading. */
  collectAudio?: boolean;
  /** Lượt Mock test được giao đang làm — để server gắn bài nộp vào đúng bài tập. */
  mockSessionId?: string;
}) {
  const [canRecord, setCanRecord] = useState(false);
  const { recording, setRecording, handleSubmit } = useSpeakingGrading(questionId, { collectAudio, mockSessionId });

  useRegisterBeforeAdvance(
    recording
      ? async () => {
          // Báo lỗi lên khung thi để học viên chọn thử lại / bỏ qua, thay vì
          // lặng lẽ chuyển câu và mất bài nói.
          if (!(await handleSubmit())) throw new Error("Không chấm được bài nói.");
        }
      : null
  );

  const handleAudioEnded = () => {
    playBeep();
    setCanRecord(true);
  };

  const handleRecordingComplete = (result: RecordingResult) => {
    setRecording(result);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-neutral-800">{instructionText}</p>

      <ExamAudioBar audioUrl={audioUrl} ttsText={ttsText} onEnded={handleAudioEnded} />

      {canRecord && (
        <SpeakingRecorderPlayer
          autoStart
          prepSeconds={prepSeconds}
          recordSeconds={recordSeconds}
          onRecordingComplete={handleRecordingComplete}
        />
      )}

      {recording && (
        <p className="rounded border border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-700">
          Your recording has been saved. Click <span className="font-semibold">Next</span> to continue.
        </p>
      )}
    </div>
  );
}
