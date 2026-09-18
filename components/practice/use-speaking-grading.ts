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

  const handleSubmit = async () => {
    if (!recording) return;
    setIsGrading(true);
    setError(null);
    try {
      const res = await submitSpeakingAttemptAction(
        questionId,
        recording.transcript,
        recording.durationSeconds
      );
      setResult(res);
    } catch {
      setError("Không thể chấm điểm bằng AI lúc này, vui lòng thử lại sau.");
    } finally {
      setIsGrading(false);
    }
  };

  return { recording, setRecording, isGrading, result, error, handleSubmit };
}
