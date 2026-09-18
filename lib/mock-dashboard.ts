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
