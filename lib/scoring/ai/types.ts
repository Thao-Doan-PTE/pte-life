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

export interface WritingGradeResult {
  criteria: Record<string, WritingCriterionScore>;
  issues: WritingIssue[];
  generalFeedback: string;
}

export interface WritingGradeInput {
  taskType: WritingTaskType;
  /** Văn bản/đề bài/transcript gốc mà học viên phải tóm tắt hoặc phản hồi. */
  sourceText: string;
  studentText: string;
}

/** Interface adapter — đổi provider AI (Claude, GPT...) chỉ cần viết class mới
 * implement interface này, không phải sửa code gọi ở nơi khác. */
export interface WritingGrader {
  grade(input: WritingGradeInput): Promise<WritingGradeResult>;
}
