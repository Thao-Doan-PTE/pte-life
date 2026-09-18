import { QUESTION_TYPES, SKILL_LABELS } from "@/lib/question-types";

/** Hàm thuần, không đụng Prisma — an toàn để import từ client component. */
export function mockTestSessionLabel(session: {
  mode: string;
  skill: string | null;
  questionTypeId: string | null;
}): string {
  if (session.mode === "full") return "Full Test";
  if (session.mode === "section" && session.skill) {
    return `Section Test — ${SKILL_LABELS[session.skill as keyof typeof SKILL_LABELS]}`;
  }
  if (session.mode === "question" && session.questionTypeId) {
    const type = QUESTION_TYPES.find((t) => t.id === session.questionTypeId);
    return type
      ? `Question Test — ${type.code} · ${type.name}`
      : `Question Test — ${session.questionTypeId}`;
  }
  return "Mocktest";
}
