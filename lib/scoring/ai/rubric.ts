import type { WritingTaskType } from "@/lib/scoring/ai/types";

/** Tiêu chí chấm theo từng dạng, đúng tinh thần rubric PTE thật — số liệu trọng số
 * chi tiết (thang điểm chính thức PTE) cần đội nội dung PTE-Life xác nhận trước khi
 * dùng để tính điểm thi thử chính thức. Ở đây mỗi tiêu chí quy về thang 0–100%. */
export const CRITERIA_BY_TASK: Record<WritingTaskType, string[]> = {
  "summarize-written-text": ["content", "form", "grammar", "vocabulary", "spelling"],
  "write-essay": [
    "content",
    "form",
    "structureDevelopment",
    "grammar",
    "vocabulary",
    "spelling",
  ],
  "summarize-spoken-text": ["content", "form", "grammar", "vocabulary", "spelling"],
};

export const CRITERION_LABELS: Record<string, string> = {
  content: "Nội dung",
  form: "Hình thức",
  structureDevelopment: "Cấu trúc & phát triển ý",
  grammar: "Ngữ pháp",
  vocabulary: "Từ vựng",
  spelling: "Chính tả",
};

const TASK_INSTRUCTIONS: Record<WritingTaskType, string> = {
  "summarize-written-text": `Đây là bài "Summarize Written Text" của PTE Academic. Học viên phải tóm tắt văn bản gốc thành ĐÚNG 1 CÂU DUY NHẤT, 5–75 từ.
Chấm theo các tiêu chí:
- content: Câu tóm tắt có phản ánh đầy đủ và chính xác ý chính của văn bản gốc không.
- form: Có đúng là 1 câu duy nhất, độ dài 5–75 từ không (trừ điểm nặng nếu sai định dạng).
- grammar: Ngữ pháp câu có đúng không.
- vocabulary: Từ vựng dùng có phù hợp, đa dạng không.
- spelling: Có lỗi chính tả không.`,
  "write-essay": `Đây là bài "Write Essay" của PTE Academic. Học viên viết luận 200–300 từ trả lời đề bài.
Chấm theo các tiêu chí:
- content: Bài viết có trả lời đúng và đầy đủ yêu cầu của đề bài không.
- form: Độ dài bài viết có nằm trong khoảng 200–300 từ không.
- structureDevelopment: Bố cục có rõ ràng (mở bài, thân bài, kết bài), luận điểm có được phát triển logic, có ví dụ minh hoạ không.
- grammar: Ngữ pháp có đa dạng và chính xác không.
- vocabulary: Từ vựng có phong phú, dùng đúng ngữ cảnh không.
- spelling: Có lỗi chính tả không.`,
  "summarize-spoken-text": `Đây là bài "Summarize Spoken Text" của PTE Academic. Học viên nghe 1 bài giảng rồi viết tóm tắt 50–70 từ.
Chấm theo các tiêu chí:
- content: Bài tóm tắt có phản ánh đầy đủ, chính xác nội dung bài giảng (transcript gốc) không.
- form: Độ dài có nằm trong khoảng 50–70 từ không.
- grammar: Ngữ pháp có đúng không.
- vocabulary: Từ vựng có phù hợp không.
- spelling: Có lỗi chính tả không.`,
};

export function buildGradingPrompt(
  taskType: WritingTaskType,
  sourceText: string,
  studentText: string
): string {
  return `${TASK_INSTRUCTIONS[taskType]}

Văn bản/đề bài gốc:
"""
${sourceText}
"""

Bài làm của học viên:
"""
${studentText}
"""

Hãy chấm điểm khách quan, nghiêm khắc và nhất quán như một giám khảo PTE thật, không dễ dãi.
scorePct của mỗi tiêu chí là số nguyên 0–100. feedback bằng tiếng Việt, ngắn gọn (1–2 câu), chỉ ra cụ thể điểm mạnh/yếu.
issues: liệt kê từng lỗi cụ thể trong bài làm — "quote" PHẢI là nguyên văn cụm từ lấy chính xác từ bài làm của học viên (để hệ thống highlight đúng vị trí), không diễn giải lại. Nếu bài làm không có lỗi đáng kể, để issues là mảng rỗng.
generalFeedback: 2–3 câu tiếng Việt tổng kết, đưa ra gợi ý cải thiện cụ thể, giọng điệu khích lệ.`;
}
