"use client";

import { useState } from "react";
import type { RecordingResult } from "@/components/practice/speaking-recorder";
import { submitSpeakingAttemptAction } from "@/lib/actions/speaking";
import type { SpeakingSubmitResult } from "@/lib/actions/speaking";

/** Gom logic dùng chung cho mọi dạng Speaking: giữ bản ghi âm, gọi AI chấm điểm,
 * quản lý trạng thái loading/lỗi. Mỗi player chỉ khác nhau ở phần "stimulus" hiển thị. */
export function useSpeakingGrading(questionId: string) {
  const [recording, setRecording] = useState<RecordingResult | null>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [result, setResult] = useState<SpeakingSubmitResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Trả về true nếu chấm xong, false nếu lỗi (đã hiện thông báo qua `error`). */
  const handleSubmit = async (): Promise<boolean> => {
    if (!recording) return false;
    setIsGrading(true);
    setError(null);
    try {
      const res = await submitSpeakingAttemptAction(
        questionId,
        recording.transcript,
        recording.durationSeconds,
        recording.pauseCount,
        recording.longestPauseMs
      );
      setResult(res);
      return true;
    } catch {
      setError("Không thể chấm điểm bằng AI lúc này, vui lòng thử lại sau.");
      return false;
    } finally {
      setIsGrading(false);
    }
  };

  return { recording, setRecording, isGrading, result, error, handleSubmit };
}
