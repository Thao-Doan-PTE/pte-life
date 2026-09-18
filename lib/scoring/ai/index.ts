import { AnthropicWritingGrader } from "@/lib/scoring/ai/anthropic-grader";
import type { WritingGrader } from "@/lib/scoring/ai/types";

export type {
  WritingGradeInput,
  WritingGradeResult,
  WritingGrader,
  WritingIssue,
  WritingIssueType,
  WritingCriterionScore,
  WritingTaskType,
} from "@/lib/scoring/ai/types";

/** Điểm gắn kết duy nhất với provider AI — đổi sang GPT hay provider khác sau này
 * chỉ cần đổi implementation trả về ở đây, không phải sửa nơi gọi. */
export function getWritingGrader(): WritingGrader {
  return new AnthropicWritingGrader();
}
