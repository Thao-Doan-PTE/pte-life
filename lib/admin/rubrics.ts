import { prisma } from "@/lib/prisma";

/** Rubric chấm của giáo viên. Bản mặc định lấy theo HANDOFF.md mục 5 — ⚠️ CHƯA
 * đối chiếu rubric Pearson hiện hành; đội chuyên môn sửa được ở trang Chấm bài
 * (lưu thành phiên bản mới trong bảng GradingRubric). Dạng bài không có rubric
 * thì không đưa vào hàng chờ giáo viên chấm. */

export interface RubricCriterion {
  key: string;
  label: string;
  max: number;
}

export interface Rubric {
  /** null = bản mặc định trong code (chưa lưu DB). */
  id: string | null;
  questionTypeId: string;
  version: number;
  criteria: RubricCriterion[];
  note: string | null;
}

export const DEFAULT_RUBRICS: Record<string, RubricCriterion[]> = {
  "write-essay": [
    { key: "content", label: "Content", max: 6 },
    { key: "form", label: "Form", max: 2 },
    { key: "development", label: "Development, structure & coherence", max: 6 },
    { key: "grammar", label: "Grammar", max: 2 },
    { key: "linguisticRange", label: "General linguistic range", max: 6 },
    { key: "vocabulary", label: "Vocabulary range", max: 2 },
    { key: "spelling", label: "Spelling", max: 2 },
  ],
  "summarize-written-text": [
    { key: "content", label: "Content", max: 4 },
    { key: "form", label: "Form", max: 1 },
    { key: "grammar", label: "Grammar", max: 2 },
    { key: "vocabulary", label: "Vocabulary", max: 2 },
  ],
  "write-email": [
    { key: "content", label: "Content", max: 3 },
    { key: "formal", label: "Formal requirements", max: 2 },
    { key: "grammar", label: "Grammar", max: 2 },
    { key: "vocabulary", label: "Vocabulary", max: 2 },
    { key: "spelling", label: "Spelling", max: 2 },
    { key: "conventions", label: "Email conventions", max: 2 },
    { key: "organization", label: "Organization", max: 2 },
  ],
  "read-aloud": [
    { key: "content", label: "Content", max: 5 },
    { key: "fluency", label: "Oral fluency", max: 5 },
    { key: "pronunciation", label: "Pronunciation", max: 5 },
  ],
  "describe-image": [
    { key: "content", label: "Content", max: 6 },
    { key: "fluency", label: "Oral fluency", max: 5 },
    { key: "pronunciation", label: "Pronunciation", max: 5 },
  ],
  "respond-to-situation": [
    { key: "appropriacy", label: "Appropriacy", max: 3 },
    { key: "fluency", label: "Oral fluency", max: 5 },
    { key: "pronunciation", label: "Pronunciation", max: 5 },
  ],
};

export function parseCriteria(value: unknown): RubricCriterion[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((c) => ({
      key: String((c as RubricCriterion)?.key ?? "").trim(),
      label: String((c as RubricCriterion)?.label ?? "").trim(),
      max: Math.round(Number((c as RubricCriterion)?.max)),
    }))
    .filter((c) => c.key && c.label && Number.isFinite(c.max) && c.max > 0);
}

/** Rubric đang dùng cho 1 dạng bài: bản mới nhất trong DB, nếu chưa có thì bản mặc định. */
export async function getActiveRubric(questionTypeId: string): Promise<Rubric | null> {
  const row = await prisma.gradingRubric.findFirst({
    where: { questionTypeId, isActive: true },
    orderBy: { version: "desc" },
  });
  if (row) {
    return { id: row.id, questionTypeId, version: row.version, criteria: parseCriteria(row.criteria), note: row.note };
  }
  const defaults = DEFAULT_RUBRICS[questionTypeId];
  return defaults ? { id: null, questionTypeId, version: 0, criteria: defaults, note: "Bản mặc định — chưa đối chiếu Pearson" } : null;
}

/** Các dạng bài giáo viên chấm (có rubric trong DB hoặc mặc định). */
export async function getTeacherGradedTypeIds(): Promise<Set<string>> {
  const rows = await prisma.gradingRubric.findMany({ where: { isActive: true }, select: { questionTypeId: true }, distinct: ["questionTypeId"] });
  return new Set([...Object.keys(DEFAULT_RUBRICS), ...rows.map((r) => r.questionTypeId)]);
}
