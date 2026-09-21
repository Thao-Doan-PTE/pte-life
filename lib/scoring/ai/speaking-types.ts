export type SpeakingTaskType =
  | "read-aloud"
  | "repeat-sentence"
  | "describe-image"
  | "retell-lecture"
  | "answer-short-question"
  | "summarize-group-discussion"
  | "respond-to-situation";

export interface SpeakingCriterionScore {
  scorePct: number;
  feedback: string;
}

export interface SpeakingGradeResult {
  criteria: {
    content: SpeakingCriterionScore;
    pronunciation: SpeakingCriterionScore;
    fluency: SpeakingCriterionScore;
    vocabulary: SpeakingCriterionScore;
  };
  generalFeedback: string;
}

export interface SpeakingGradeInput {
  taskType: SpeakingTaskType;
  /** Bản chuyển văn bản tự động (Web Speech API của trình duyệt) — có thể có lỗi nhận dạng. */
  transcript: string;
  durationSeconds: number;
  wordsPerMinute: number;
  fillerWordCount: number;
  /** Số lần ngắt quãng và khoảng lặng dài nhất (ms), đo bằng phân tích biên độ âm
   * thanh thời gian thực ở client (Web Audio API) — undefined nếu trình duyệt
   * không hỗ trợ AudioContext, khi đó AI sẽ chỉ dựa vào WPM/filler như trước. */
  pauseCount?: number;
  longestPauseMs?: number;
  /** Văn bản/transcript gốc để so sánh nội dung (đoạn đọc, bài giảng, câu hỏi, tình huống...). */
  referenceText?: string;
  /** Chỉ dùng cho Describe Image — gửi kèm ảnh để AI đối chiếu nội dung mô tả. */
  imageBase64?: string;
  imageMediaType?: string;
}

/** Interface adapter — giống WritingGrader. V1 chỉ có Claude + Web Speech API transcript
 * (chưa có ASR/pronunciation assessment chuyên dụng — xem ghi chú trong anthropic-speaking-grader.ts). */
export interface SpeakingGrader {
  grade(input: SpeakingGradeInput): Promise<SpeakingGradeResult>;
}
