import {
  ENTRY_TEST_LEVEL_BANDS,
  type EntryTestQuestion,
  type EntryTestSection,
} from "@/lib/entry-test-data";

/** Chuẩn hoá chuỗi để so khớp đáp án: thường hoá, bỏ dấu câu cuối, gộp khoảng trắng. */
export function normalizeAnswer(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[.,!?;:]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(value: string): number {
  const normalized = normalizeAnswer(value);
  return normalized ? normalized.split(" ").length : 0;
}

/**
 * Chấm 1 câu. Trả về `null` nếu câu chưa có đáp án chuẩn (Speaking luôn vậy;
 * Listening cũng vậy ở gói nội dung hiện tại — chờ giáo viên chấm tay) — khác
 * với 0 điểm (trả lời sai).
 */
export function gradeEntryTestQuestion(question: EntryTestQuestion, response: string | null | undefined): number | null {
  switch (question.type) {
    case "read_aloud":
      return null;
    case "mcq":
      return normalizeAnswer(response) === normalizeAnswer(question.answer) ? question.points : 0;
    case "dropdown_gap":
      if (question.answer == null) return null;
      return normalizeAnswer(response) === normalizeAnswer(question.answer) ? question.points : 0;
    case "word_form":
    case "reorder": {
      const accepted = question.answer;
      return accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(response)) ? question.points : 0;
    }
    case "gap_fill":
    case "short_answer": {
      if (question.answer == null) return null;
      if (wordCount(response ?? "") > question.maxWords) return 0;
      return question.answer.some((a) => normalizeAnswer(a) === normalizeAnswer(response)) ? question.points : 0;
    }
    default:
      return null;
  }
}

export interface SectionGradeResult {
  key: EntryTestSection["key"];
  name: string;
  pointsAwarded: number;
  pointsMax: number;
  pending: boolean;
}

export interface EntryTestGradeSummary {
  sections: SectionGradeResult[];
  scoreAuto: number;
  gradeableMax: number;
  percent: number;
  level: string;
  suggestion: string;
}

const TEACHER_GRADED_SECTIONS = new Set<string>(["speaking", "listening"]);

/**
 * Chấm toàn bộ đề từ danh sách câu trả lời (questionId -> response text).
 * Điểm % xếp trình độ chỉ tính trên phần ĐÃ có đáp án chuẩn (Word + Reading ở
 * gói hiện tại) — khớp đúng cách bản mẫu tính (`pct = auto/graded*100`), vì
 * Speaking/Listening chưa có đáp án/người chấm tại thời điểm nộp bài.
 */
export function gradeEntryTestAttempt(
  sections: EntryTestSection[],
  responses: Record<string, string | null | undefined>
): EntryTestGradeSummary {
  const sectionResults: SectionGradeResult[] = sections.map((section) => {
    let pointsAwarded = 0;
    // Speaking/Listening do giáo viên chấm tay: luôn "chờ chấm" dù bài có đáp án mẫu hay không.
    let pending = TEACHER_GRADED_SECTIONS.has(section.key);
    for (const item of section.items) {
      if (pending) break;
      const score = gradeEntryTestQuestion(item, responses[item.id]);
      if (score === null) pending = true;
      else pointsAwarded += score;
    }
    if (pending) pointsAwarded = 0;
    return { key: section.key, name: section.name, pointsAwarded, pointsMax: section.pointsLabel, pending };
  });

  const scoreAuto = sectionResults.reduce((sum, s) => sum + s.pointsAwarded, 0);
  const gradeableMax = sectionResults.filter((s) => !s.pending).reduce((sum, s) => sum + s.pointsMax, 0);
  const percent = gradeableMax > 0 ? Math.round((scoreAuto / gradeableMax) * 100) : 0;
  const band = ENTRY_TEST_LEVEL_BANDS.find((b) => percent >= b.minPct) ?? ENTRY_TEST_LEVEL_BANDS[ENTRY_TEST_LEVEL_BANDS.length - 1];

  return { sections: sectionResults, scoreAuto, gradeableMax, percent, level: band.level, suggestion: band.suggestion };
}
