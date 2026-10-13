import { RULE_BASED_TYPE_IDS } from "@/lib/scoring/rule-based";
import { CRITERIA_BY_TASK } from "@/lib/scoring/ai/rubric";
import type { ExamPackage, Skill } from "@/lib/question-types";

/** Thông tin hiển thị cho trang Ngân hàng đề (HANDOFF §4.8) — suy ra từ cấu hình
 * sẵn có trong repo, không giữ danh sách riêng để tránh lệch với code chấm thật. */

/** 3 nhóm kỹ năng của thẻ tổng: Speaking & Writing · Reading · Listening. */
export type SkillGroup = "sw" | "r" | "l";

export const SKILL_GROUPS: { key: SkillGroup; label: string; skills: Skill[] }[] = [
  { key: "sw", label: "Speaking & Writing", skills: ["speaking", "writing"] },
  { key: "r", label: "Reading", skills: ["reading"] },
  { key: "l", label: "Listening", skills: ["listening"] },
];

export function skillGroupOf(skill: Skill): SkillGroup {
  return skill === "reading" ? "r" : skill === "listening" ? "l" : "sw";
}

export function parseSkillGroup(value: string | undefined): SkillGroup | null {
  return value === "sw" || value === "r" || value === "l" ? value : null;
}

export type GradingMode = "auto" | "ai" | "teacher";

export const GRADING_MODE_LABEL: Record<GradingMode, string> = {
  auto: "Tự động",
  ai: "AI",
  teacher: "Giáo viên",
};

export const GRADING_MODE_TONE: Record<GradingMode, "mute" | "plum" | "warn"> = {
  auto: "mute",
  ai: "plum",
  teacher: "warn",
};

/** Cách chấm thực tế của 1 dạng bài:
 * - Tự động: có trong RULE_BASED_TYPE_IDS (lib/scoring/rule-based.ts).
 * - AI: Writing/SST có tiêu chí AI trong CRITERIA_BY_TASK (lib/scoring/ai/rubric.ts);
 *   mọi dạng Speaking đều được submitSpeakingAttemptAction gửi cho AI chấm
 *   (lib/actions/speaking.ts).
 * - Giáo viên: chưa có bộ chấm nào (VD Write Email — dạng PTE Core chưa có nội dung). */
export function gradingModeOf(type: { id: string; skill: Skill }): GradingMode {
  if (RULE_BASED_TYPE_IDS.has(type.id)) return "auto";
  if (Object.hasOwn(CRITERIA_BY_TASK, type.id)) return "ai";
  if (type.skill === "speaking") return "ai";
  return "teacher";
}

/** "Academic · Core" / "Academic" / "Core". */
export function appliesToLabel(availableIn: readonly ExamPackage[]): string {
  const ac = availableIn.includes("academic");
  const core = availableIn.includes("core");
  if (ac && core) return "Academic · Core";
  if (ac) return "Academic";
  if (core) return "Core";
  return "—";
}

/** Tỷ lệ câu Tủ (%), 0 khi chưa có câu nào. */
export function tuRatio(count: number, tuCount: number): number {
  return count > 0 ? (100 * tuCount) / count : 0;
}

export function formatCount(n: number): string {
  return n.toLocaleString("vi-VN");
}
