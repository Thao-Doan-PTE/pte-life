import type { WritingTaskType } from "@/lib/scoring/ai/types";

/** Kết quả kiểm tra hình thức (Form) bài viết — tính bằng code, không để AI tự
 * đếm từ/đếm câu (AI đếm hay sai và có thể bị "lừa").
 *
 * Thang điểm theo PTE Academic Score Guide (Pearson):
 * - Summarize Written Text: đúng 1 câu hoàn chỉnh, 5–75 từ → đạt; sai → 0.
 * - Write Essay: 200–300 từ → 2/2; 120–199 hoặc 301–380 → 1/2; <120 hoặc >380 → 0.
 * - Summarize Spoken Text: 50–70 từ → 2/2; 40–49 hoặc 71–100 → 1/2; <40 hoặc >100 → 0.
 * - Viết toàn chữ IN HOA hoặc không có dấu câu → 0.
 * Form = 0 thì Pearson không chấm tiếp các tiêu chí khác (bài được 0 điểm). */
export interface WritingFormCheck {
  wordCount: number;
  sentenceCount: number;
  /** Điểm Form quy về %: 100 (đạt), 50 (đạt một phần), 0 (không đạt). */
  formPct: 0 | 50 | 100;
  /** true khi Form = 0 → theo luật PTE, cả bài được 0 điểm. */
  stopsScoring: boolean;
  /** Giải thích ngắn bằng tiếng Việt, hiện cho học viên. */
  reason: string;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Đếm câu: dấu . ! ? kết thúc câu khi theo sau là khoảng trắng + chữ in hoa/số
 * mở đầu câu mới (để "e.g. this", "3.5%", "U.S. policy" không bị tính là 2 câu),
 * cộng thêm câu cuối cùng. */
const ABBREVIATIONS = /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|U\.S|U\.K|U\.N|a\.m|p\.m)\./gi;

export function countSentences(text: string): number {
  // Bỏ dấu chấm của các từ viết tắt thường gặp ("Dr. Smith", "the U.S. Government").
  const trimmed = text.trim().replace(ABBREVIATIONS, (m) => m.replace(/\./g, ""));
  if (!trimmed) return 0;
  const boundaries = trimmed.match(/[.!?]+["')\]]*\s+(?=["'(\[]?[\p{Lu}\p{N}])/gu)?.length ?? 0;
  return boundaries + 1;
}

function isAllCaps(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length < 10) return false;
  return !letters.some((ch) => ch !== ch.toUpperCase());
}

function hasPunctuation(text: string): boolean {
  return /[.,;:!?]/.test(text);
}

const BANDS: Record<WritingTaskType, { full: [number, number]; partial?: [number, number] }> = {
  "summarize-written-text": { full: [5, 75] },
  "write-essay": { full: [200, 300], partial: [120, 380] },
  "summarize-spoken-text": { full: [50, 70], partial: [40, 100] },
};

const TASK_LABEL: Record<WritingTaskType, string> = {
  "summarize-written-text": "Summarize Written Text",
  "write-essay": "Write Essay",
  "summarize-spoken-text": "Summarize Spoken Text",
};

export function checkWritingForm(taskType: WritingTaskType, text: string): WritingFormCheck {
  const wordCount = countWords(text);
  const sentenceCount = countSentences(text);
  const band = BANDS[taskType];
  const label = TASK_LABEL[taskType];
  const zero = (reason: string): WritingFormCheck => ({ wordCount, sentenceCount, formPct: 0, stopsScoring: true, reason });

  if (isAllCaps(text)) return zero("Bài viết toàn chữ IN HOA — PTE chấm 0 điểm hình thức.");
  if (wordCount > 0 && !hasPunctuation(text)) return zero("Bài viết không có dấu câu — PTE chấm 0 điểm hình thức.");

  if (taskType === "summarize-written-text") {
    if (wordCount < band.full[0] || wordCount > band.full[1]) {
      return zero(`${label} cần 5–75 từ, bài của bạn có ${wordCount} từ — PTE chấm 0 điểm cả câu.`);
    }
    if (sentenceCount !== 1) {
      return zero(`${label} phải là ĐÚNG 1 CÂU, bài của bạn có ${sentenceCount} câu — PTE chấm 0 điểm cả câu.`);
    }
    return { wordCount, sentenceCount, formPct: 100, stopsScoring: false, reason: `Đúng 1 câu, ${wordCount} từ.` };
  }

  const [fullMin, fullMax] = band.full;
  const [partMin, partMax] = band.partial!;
  if (wordCount >= fullMin && wordCount <= fullMax) {
    return { wordCount, sentenceCount, formPct: 100, stopsScoring: false, reason: `${wordCount} từ — đúng độ dài chuẩn ${fullMin}–${fullMax} từ.` };
  }
  if (wordCount >= partMin && wordCount <= partMax) {
    return {
      wordCount,
      sentenceCount,
      formPct: 50,
      stopsScoring: false,
      reason: `${wordCount} từ — ngoài khoảng chuẩn ${fullMin}–${fullMax} từ nên chỉ được một nửa điểm hình thức.`,
    };
  }
  return zero(`${label} cần ${fullMin}–${fullMax} từ (tối thiểu ${partMin}, tối đa ${partMax}), bài của bạn có ${wordCount} từ — PTE chấm 0 điểm cả bài.`);
}
