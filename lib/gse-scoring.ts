import { QUESTION_TYPES } from "@/lib/question-types";

export interface GseBreakdown {
  overall: number;
  listening: number;
  reading: number;
  speaking: number;
  writing: number;
}

const SKILLS = ["listening", "reading", "speaking", "writing"] as const;

function toGseScore(ratio: number): number {
  return Math.max(10, Math.min(90, Math.round(10 + ratio * 80)));
}

/**
 * Tính điểm GSE (10-90) theo đúng chuẩn Pearson PTE Academic — KHÔNG lấy trung
 * bình cộng đơn giản giữa các câu/kỹ năng. Overall và từng kỹ năng đều là tỷ lệ
 * (điểm đạt được / điểm tối đa) có trọng số theo overallWeightPct và
 * weighting[skill] của từng dạng câu hỏi, rồi map sang thang GSE 10-90.
 *
 * Áp dụng "Integrated Skills Routing": 1 câu có thể đóng góp điểm vào nhiều kỹ
 * năng cùng lúc theo đúng bảng trọng số PTE thật (VD: WFD cộng vào cả Listening
 * lẫn Writing) — lấy thẳng từ `weighting` đã có sẵn trong lib/question-types.ts,
 * không cần định nghĩa lại danh sách routing riêng.
 */
export function computeGseScores(entries: { questionTypeId: string; scorePct: number }[]): GseBreakdown {
  let overallEarned = 0;
  let overallMax = 0;
  const skillEarned = { listening: 0, reading: 0, speaking: 0, writing: 0 };
  const skillMax = { listening: 0, reading: 0, speaking: 0, writing: 0 };

  for (const entry of entries) {
    const type = QUESTION_TYPES.find((t) => t.id === entry.questionTypeId);
    const weighting = type?.weighting;
    if (!weighting) continue;
    const ratio = entry.scorePct / 100;

    if (weighting.overall > 0) {
      overallEarned += ratio * weighting.overall;
      overallMax += weighting.overall;
    }
    for (const skill of SKILLS) {
      const weight = weighting[skill];
      if (weight > 0) {
        skillEarned[skill] += ratio * weight;
        skillMax[skill] += weight;
      }
    }
  }

  return {
    overall: overallMax > 0 ? toGseScore(overallEarned / overallMax) : 10,
    listening: skillMax.listening > 0 ? toGseScore(skillEarned.listening / skillMax.listening) : 10,
    reading: skillMax.reading > 0 ? toGseScore(skillEarned.reading / skillMax.reading) : 10,
    speaking: skillMax.speaking > 0 ? toGseScore(skillEarned.speaking / skillMax.speaking) : 10,
    writing: skillMax.writing > 0 ? toGseScore(skillEarned.writing / skillMax.writing) : 10,
  };
}
