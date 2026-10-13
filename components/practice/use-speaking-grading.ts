"use client";

import { useState } from "react";
import type { RecordingResult } from "@/components/practice/speaking-recorder";
import { submitSpeakingAttemptAction } from "@/lib/actions/speaking";
import type { SpeakingSubmitResult } from "@/lib/actions/speaking";

/** Khớp giới hạn ở server (lib/actions/speaking.ts) — file lớn hơn thì không gửi
 * kèm, để request không vượt giới hạn body 4MB của server action và làm hỏng việc chấm. */
const MAX_AUDIO_UPLOAD_BYTES = 3.5 * 1024 * 1024;

function audioExtension(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("aac")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

/** FormData chứa file ghi âm (field "audio") gửi kèm bài nộp. Server chỉ lưu khi
 * bài thuộc bài tập được giao cần giáo viên chấm; còn lại bỏ qua. */
function buildAudioForm(blob: Blob | undefined): FormData | undefined {
  if (!blob || blob.size === 0 || blob.size > MAX_AUDIO_UPLOAD_BYTES) return undefined;
  const type = blob.type || "audio/webm";
  const form = new FormData();
  form.append("audio", new File([blob], `recording.${audioExtension(type)}`, { type }));
  return form;
}

export interface SpeakingGradingOptions {
  /** Trang (server) đã tính: câu này đang là bài nộp chờ giáo viên chấm → gửi
   * kèm file ghi âm. Mặc định false: tự luyện / Mock test thường chỉ gửi
   * transcript + số liệu, không tải file lên vô ích. Server vẫn tự kiểm tra lại. */
  collectAudio?: boolean;
  /** Lượt Mock test đang làm (chỉ khi lượt đó gắn bài tập) — để server ưu tiên
   * gắn bài nộp vào đúng bài tập của lượt thi. */
  mockSessionId?: string;
}

/** Gom logic dùng chung cho mọi dạng Speaking: giữ bản ghi âm, gọi AI chấm điểm,
 * quản lý trạng thái loading/lỗi. Mỗi player chỉ khác nhau ở phần "stimulus" hiển thị. */
export function useSpeakingGrading(questionId: string, options: SpeakingGradingOptions = {}) {
  const { collectAudio = false, mockSessionId } = options;
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
        recording.longestPauseMs,
        collectAudio ? buildAudioForm(recording.audioBlob) : undefined,
        mockSessionId
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
