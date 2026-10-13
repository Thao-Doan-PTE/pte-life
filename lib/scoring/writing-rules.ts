import type { WritingGradeResult, WritingTaskType } from "@/lib/scoring/ai/types";
import type { WritingFormCheck } from "@/lib/scoring/writing-form";
import { CRITERIA_BY_TASK } from "@/lib/scoring/ai/rubric";

/** Ngưỡng câu mẫu: quá 60% số câu là câu khung chung chung thì giới hạn điểm từ
 * vựng/cấu trúc ở mức 50% (bài viết phần lớn là câu học thuộc, không thể hiện
 * vốn từ/khả năng phát triển ý thật). */
const TEMPLATE_DENSITY_LIMIT = 60;
const TEMPLATE_CAPPED_CRITERIA = ["vocabulary", "structureDevelopment"];
const TEMPLATE_CAP_PCT = 50;

/** Áp các quy tắc chấm cứng lên điểm thô của AI — làm bằng code để kết quả nhất
 * quán và không bị AI "quên" hay bị bài làm thao túng:
 * 1. Điểm Form luôn lấy từ bộ đếm của hệ thống (writing-form.ts).
 * 2. Form = 0 → cả bài 0 điểm (Pearson không chấm tiếp các tiêu chí khác).
 * 3. Lạc đề → Content = 0 → cả bài 0 điểm (Pearson không chấm tiếp).
 * 4. Write Essay có > 60% câu mẫu → Từ vựng, Cấu trúc tối đa 50%.
 * Vẫn giữ nhận xét của AI ở các tiêu chí để học viên biết cần sửa gì. */
export function applyWritingRules(
  taskType: WritingTaskType,
  raw: WritingGradeResult,
  formCheck: WritingFormCheck
): WritingGradeResult {
  const criteria: WritingGradeResult["criteria"] = {};
  for (const key of CRITERIA_BY_TASK[taskType]) {
    const c = raw.criteria?.[key];
    criteria[key] = {
      scorePct: Math.min(100, Math.max(0, Math.round(Number(c?.scorePct) || 0))),
      feedback: typeof c?.feedback === "string" ? c.feedback : "",
    };
  }
  criteria.form = { scorePct: formCheck.formPct, feedback: formCheck.reason };

  const integrity = {
    offTopic: raw.integrity?.offTopic === true,
    templateDensityPct: Math.min(100, Math.max(0, Math.round(Number(raw.integrity?.templateDensityPct) || 0))),
  };
  const appliedRules: string[] = [];

  if (formCheck.stopsScoring) {
    for (const key of Object.keys(criteria)) criteria[key].scorePct = 0;
    appliedRules.push(`Sai hình thức: ${formCheck.reason} Theo luật PTE, bài sai hình thức không được chấm tiếp các tiêu chí khác.`);
  } else if (integrity.offTopic) {
    for (const key of Object.keys(criteria)) criteria[key].scorePct = 0;
    criteria.content.feedback = `Bài viết không trả lời đúng đề/chủ đề. ${criteria.content.feedback}`.trim();
    appliedRules.push("Lạc đề: bài không trả lời đúng yêu cầu của đề (hoặc chỉ ghép câu mẫu học thuộc). Theo luật PTE, Nội dung = 0 thì bài không được chấm tiếp.");
  } else if (taskType === "write-essay" && integrity.templateDensityPct > TEMPLATE_DENSITY_LIMIT) {
    for (const key of TEMPLATE_CAPPED_CRITERIA) {
      if (criteria[key]) criteria[key].scorePct = Math.min(criteria[key].scorePct, TEMPLATE_CAP_PCT);
    }
    appliedRules.push(
      `Dùng quá nhiều câu mẫu (${integrity.templateDensityPct}% số câu là câu khung chung chung): điểm Từ vựng và Cấu trúc tối đa ${TEMPLATE_CAP_PCT}%. Hãy thay câu mẫu bằng lập luận và ví dụ riêng cho đề này.`
    );
  }

  return {
    criteria,
    issues: Array.isArray(raw.issues) ? raw.issues : [],
    generalFeedback: typeof raw.generalFeedback === "string" ? raw.generalFeedback : "",
    formCheck,
    integrity,
    appliedRules,
  };
}

/** Kết quả khi bài quá ngắn để chấm (không gọi AI, tiết kiệm chi phí). */
export function emptyWritingGrade(taskType: WritingTaskType, formCheck: WritingFormCheck): WritingGradeResult {
  const criteria: WritingGradeResult["criteria"] = {};
  for (const key of CRITERIA_BY_TASK[taskType]) {
    criteria[key] = { scorePct: 0, feedback: "Bài làm quá ngắn để chấm tiêu chí này." };
  }
  criteria.form = { scorePct: 0, feedback: formCheck.reason };
  return {
    criteria,
    issues: [],
    generalFeedback: "Bài làm quá ngắn nên hệ thống không chấm. Hãy viết đầy đủ theo yêu cầu độ dài của đề rồi nộp lại.",
    formCheck,
    integrity: { offTopic: false, templateDensityPct: 0 },
    appliedRules: [`Sai hình thức: ${formCheck.reason}`],
  };
}
