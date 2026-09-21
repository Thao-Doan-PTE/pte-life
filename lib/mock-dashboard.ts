import type { Skill } from "@/lib/question-types";

export interface RecentAttempt {
  id: string;
  skill: Skill;
  questionTypeId: string;
  questionCode: string;
  scorePct: number;
  attemptedAt: string; // ISO datetime
}

export interface SkillProgress {
  skill: Skill;
  totalQuestions: number;
  practicedQuestions: number;
  progressPct: number;
  topType: { id: string; name: string } | null;
  /** Điểm PTE trung bình (0-90) cộng dồn vào kỹ năng này — các dạng bài tích hợp
   * (VD: Write From Dictation, Repeat Sentence) đóng góp điểm vào cả 2 kỹ năng
   * theo bảng tỉ trọng thật, không chỉ riêng kỹ năng chính của dạng bài đó. */
  avgPteScore: number | null;
  scoredAttemptCount: number;
}

export interface DashboardOverview {
  totalQuestions: number;
  overallAccuracyPct: number;
  accuracyDeltaPct: number;
  currentStreak: number;
  bestStreak: number;
  studyTimeTotalMin: number;
  studyTimeAvgPerDayMin: number;
  todayCount: number;
  todayDeltaVsYesterday: number;
  scoreDelta2Weeks: number;
  weeklyTrend: { dayLabel: string; count: number }[];
  weeklyAvgPerDay: number;
}
