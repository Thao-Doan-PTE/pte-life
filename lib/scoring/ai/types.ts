import type { WritingFormCheck } from "@/lib/scoring/writing-form";

export type WritingTaskType =
  | "summarize-written-text"
  | "write-essay"
  | "summarize-spoken-text";

export interface WritingCriterionScore {
  scorePct: number;
  feedback: string;
}

export type WritingIssueType =
  | "grammar"
  | "vocabulary"
  | "spelling"
  | "content"
  | "form";

export interface WritingIssue {
  /** Trích nguyên văn cụm từ có lỗi trong bài làm của học viên, để highlight trực tiếp. */
  quote: string;
  type: WritingIssueType;
  suggestion: string;
  explanation: string;
}

/** Dấu hiệu "học tủ/lách luật" do AI đánh giá (xem rubric.ts). */
export interface WritingIntegrity {
  /** Bài không trả lời đúng đề/chủ đề (vd. chép câu mẫu học thuộc lạc đề). */
  offTopic: boolean;
  /** % số câu là câu mẫu chung chung học thuộc, không mang ý riêng. */
  templateDensityPct: number;
}

export interface WritingGradeResult {
  criteria: Record<string, WritingCriterionScore>;
  issues: WritingIssue[];
  generalFeedback: string;
  /** Kiểm tra hình thức bằng code (số từ, số câu) — không có ở bài chấm trước bản này. */
  formCheck?: WritingFormCheck;
  integrity?: WritingIntegrity;
  /** Các quy tắc chấm đã áp dụng (tiếng Việt), hiện cho học viên. */
  appliedRules?: string[];
}

export interface WritingGradeInput {
  taskType: WritingTaskType;
  /** Văn bản/đề bài/transcript gốc mà học viên phải tóm tắt hoặc phản hồi. */
  sourceText: string;
  studentText: string;
  /** Số từ / số câu do hệ thống đếm, để AI nhận xét khớp với điểm hình thức. */
  wordCount: number;
  sentenceCount: number;
}

/** Interface adapter — đổi provider AI (Claude, GPT...) chỉ cần viết class mới
 * implement interface này, không phải sửa code gọi ở nơi khác. */
export interface WritingGrader {
  /** Trả về điểm thô của AI (chưa áp quy tắc hình thức/chống học tủ — xem writing-rules.ts). */
  grade(input: WritingGradeInput): Promise<WritingGradeResult>;
}
