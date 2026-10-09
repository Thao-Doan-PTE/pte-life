/** Hàm thuần, không đụng Prisma — an toàn để import từ client lẫn server component. */

export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

export const DIFFICULTY_LABEL: Record<DifficultyLevel, string> = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
};

export const DIFFICULTY_COLOR: Record<DifficultyLevel, string> = {
  EASY: "var(--wfd-green)",
  MEDIUM: "#f59e0b",
  HARD: "var(--wfd-red)",
};

/** Từ vựng Academic Word List (AWL) mức C1-C2 dùng để ước lượng độ khó văn bản. */
const AWL_ADVANCED_KEYWORDS = new Set([
  "hypothesis",
  "methodology",
  "infrastructure",
  "subsequent",
  "unprecedented",
  "implementation",
  "concurrence",
  "empirical",
  "fluctuation",
  "cohesion",
  "substantive",
  "quantitative",
  "qualitative",
  "paradigm",
  "correlation",
]);

const COMPLEX_CLAUSE_PATTERN = /\b(although|whereas|furthermore|notwithstanding|inasmuch|consequently)\b/i;

/** Dạng bài chỉ nhắc/chép lại nguyên văn — ngưỡng phân loại theo số từ thay vì tỷ lệ từ học thuật. */
const DICTATION_REPEAT_TYPE_IDS = new Set(["write-from-dictation", "repeat-sentence"]);

export function extractTextMetrics(text: string): {
  wordCount: number;
  academicRatio: number;
  hasComplexStructure: boolean;
} {
  if (!text) return { wordCount: 0, academicRatio: 0, hasComplexStructure: false };

  const words = text.match(/\b\w+\b/g) ?? [];
  const wordCount = words.length;
  const academicWords = words.filter((w) => AWL_ADVANCED_KEYWORDS.has(w.toLowerCase()) || w.length > 8);
  const academicRatio = wordCount > 0 ? academicWords.length / wordCount : 0;
  const hasComplexStructure = COMPLEX_CLAUSE_PATTERN.test(text);

  return { wordCount, academicRatio: Math.round(academicRatio * 1000) / 1000, hasComplexStructure };
}

/** Port của `classify_difficulty_rules` (ingest_questions.py) — quy tắc theo từng nhóm dạng bài. */
export function classifyDifficulty(typeId: string, text: string): DifficultyLevel {
  const { wordCount, academicRatio } = extractTextMetrics(text);

  // Write from Dictation & Repeat Sentence: chép/nhắc nguyên văn nên phân loại theo số từ.
  if (DICTATION_REPEAT_TYPE_IDS.has(typeId)) {
    if (wordCount <= 9 && academicRatio < 0.15) return "EASY";
    if (wordCount <= 12 && academicRatio < 0.25) return "MEDIUM";
    return "HARD";
  }

  // Read Aloud: đoạn văn dài hơn, ngưỡng số từ khác hẳn nhóm dictation/repeat.
  if (typeId === "read-aloud") {
    if (wordCount < 40 && academicRatio < 0.12) return "EASY";
    if (wordCount <= 55 || academicRatio < 0.22) return "MEDIUM";
    return "HARD";
  }

  // Các dạng còn lại: phân loại theo tỷ lệ từ học thuật.
  if (academicRatio < 0.1) return "EASY";
  if (academicRatio < 0.2) return "MEDIUM";
  return "HARD";
}
