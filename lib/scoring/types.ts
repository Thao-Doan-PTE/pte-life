export interface ScoreResult {
  /** 0–100 */
  scorePct: number;
  /** Quy đổi ước tính sang thang điểm PTE 10–90 (tuyến tính đơn giản). */
  pteScore: number;
  correct: boolean;
  /** Dữ liệu để UI hiển thị đáp án đúng sau khi nộp bài — khác nhau theo từng dạng. */
  reveal: Record<string, unknown>;
}

export function toPteScore(scorePct: number): number {
  return Math.round(10 + (scorePct / 100) * 80);
}

export function clampPct(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}
