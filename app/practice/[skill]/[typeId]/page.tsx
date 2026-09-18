import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { PRACTICE_INSTRUCTIONS } from "@/lib/practice-config";
import { getQuestionsForType, getPracticedSet } from "@/lib/practice-queries";
import { questionExcerpt } from "@/lib/question-excerpt";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { WfdQuestionList } from "@/components/wfd/wfd-question-list";
import { PracticeQuestionList } from "@/components/practice/practice-question-list";
import { getWfdQuestions, getWfdPracticedSet, getStreakDays } from "@/lib/wfd-queries";

const VALID_SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export default async function PracticeQuestionTypePage({
  params,
}: {
  params: Promise<{ skill: string; typeId: string }>;
}) {
  const { skill, typeId } = await params;

  if (!VALID_SKILLS.includes(skill as Skill)) {
    notFound();
  }

  const questionType = QUESTION_TYPES.find(
    (q) => q.id === typeId && q.skill === skill
  );
  if (!questionType) {
    notFound();
  }

  const session = await auth();
  const userId = session!.user.id;

  if (typeId === "write-from-dictation") {
    const [questions, practicedSet, streakDays] = await Promise.all([
      getWfdQuestions(),
      getWfdPracticedSet(userId),
      getStreakDays(userId),
    ]);
    const weighting = questionType.weighting;

    return (
      <AppShell>
        <WfdShell>
          <WfdQuestionList
            questions={questions.map((q) => ({
              id: q.id,
              sentence: (q.content as Record<string, unknown>).sentence as string,
            }))}
            practicedIds={Array.from(practicedSet)}
            streakDays={streakDays}
            weighting={{
              overall: weighting?.overall ?? 0,
              listening: weighting?.listening ?? 0,
              writing: weighting?.writing ?? 0,
            }}
          />
        </WfdShell>
      </AppShell>
    );
  }

  const instructions = PRACTICE_INSTRUCTIONS[typeId];
  if (!instructions) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-10 text-center sm:px-10">
          <h1 className="text-2xl font-semibold">{questionType.name}</h1>
          <p className="text-sm text-muted-foreground">
            Luồng luyện tập cho dạng này sẽ được triển khai ở bước sau của roadmap.
          </p>
        </div>
      </AppShell>
    );
  }

  const [questions, practicedSet, streakDays] = await Promise.all([
    getQuestionsForType(typeId),
    getPracticedSet(userId, typeId),
    getStreakDays(userId),
  ]);

  if (questions.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-10 text-center sm:px-10">
          <h1 className="text-2xl font-semibold">{questionType.name}</h1>
          <p className="text-sm text-muted-foreground">
            Chưa có câu hỏi mẫu nào trong ngân hàng cho dạng này.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <WfdShell>
        <PracticeQuestionList
          skill={skill}
          typeId={typeId}
          typeName={questionType.name}
          descriptionVi={questionType.descriptionVi}
          questions={questions.map((q) => ({
            id: q.id,
            excerpt: questionExcerpt(q.content as Record<string, unknown>),
          }))}
          practicedIds={Array.from(practicedSet)}
          streakDays={streakDays}
          weighting={{
            overall: questionType.overallWeightPct,
            skillPct: questionType.skillWeightPct,
          }}
        />
      </WfdShell>
    </AppShell>
  );
}
