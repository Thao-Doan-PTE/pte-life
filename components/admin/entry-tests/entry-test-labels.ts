import type { EntryTestQuestionType } from "@/lib/entry-test-data";

/** Nhãn hiển thị dùng chung cho các trang Admin "Test đầu vào". */

type Tone = "ok" | "warn" | "bad" | "plum" | "mute";

export const ATTEMPT_STATUS_META: Record<"IN_PROGRESS" | "SUBMITTED" | "GRADED", { label: string; tone: Tone }> = {
  IN_PROGRESS: { label: "Đang làm", tone: "mute" },
  SUBMITTED: { label: "Đã nộp · chờ giáo viên chấm", tone: "warn" },
  GRADED: { label: "Đã chấm", tone: "ok" },
};

export const PURPOSE_LABEL: Record<string, string> = {
  DU_HOC: "Du học",
  DINH_CU: "Định cư",
  XIN_VIEC: "Xin việc / hành nghề",
  KHAC: "Khác",
};

export const CONSULTATION_TOPIC_META: Record<string, { label: string; tone: "plum" | "ok" }> = {
  consult: { label: "Tư vấn lộ trình", tone: "plum" },
  trial: { label: "Học thử miễn phí", tone: "ok" },
};

export const CONSULTATION_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  NEW: { label: "Mới", tone: "warn" },
  CONTACTED: { label: "Đã liên hệ", tone: "plum" },
  DONE: { label: "Hoàn tất", tone: "ok" },
};

export const QUESTION_TYPE_LABEL: Record<EntryTestQuestionType, string> = {
  read_aloud: "Đọc to",
  mcq: "Trắc nghiệm",
  word_form: "Chia dạng từ",
  reorder: "Sắp xếp câu",
  dropdown_gap: "Chọn từ điền chỗ trống",
  gap_fill: "Điền biểu mẫu",
  short_answer: "Trả lời ngắn",
};
