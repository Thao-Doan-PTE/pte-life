import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { PRACTICE_INSTRUCTIONS } from "@/lib/practice-config";
import { getQuestionsForType, getPracticedSet, getFavoriteSet } from "@/lib/practice-queries";
import { questionExcerpt, extractQuestionText } from "@/lib/question-excerpt";
import { classifyDifficulty } from "@/lib/difficulty";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { WfdQuestionList } from "@/components/wfd/wfd-question-list";
import { PracticeQuestionList } from "@/components/practice/practice-question-list";
import { getWfdQuestions, getWfdPracticedSet, getWfdFavoriteSet } from "@/lib/wfd-queries";

const VALID_SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export default async function PracticeQuestionTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ skill: string; typeId: string }>;
  searchParams: Promise<{ bank?: string }>;
}) {
  const { skill, typeId } = await params;
  const { bank: bankParam } = await searchParams;
  const bank = bankParam === "TU" ? "TU" : undefined;

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
    const [questions, practicedSet, favoriteSet] = await Promise.all([
      getWfdQuestions(bank),
      getWfdPracticedSet(userId),
      getWfdFavoriteSet(userId),
    ]);
    const weighting = questionType.weighting;

    return (
      <AppShell>
        <WfdShell>
          <WfdQuestionList
            questions={questions.map((q) => {
              const sentence = (q.content as Record<string, unknown>).sentence as string;
              return {
                id: q.id,
                sentence,
                difficulty: classifyDifficulty("write-from-dictation", sentence),
              };
            })}
            practicedIds={Array.from(practicedSet)}
            favoriteIds={Array.from(favoriteSet)}
            weighting={{
              overall: weighting?.overall ?? 0,
              listening: weighting?.listening ?? 0,
              writing: weighting?.writing ?? 0,
            }}
            bank={bank}
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
          <p className="text-[15px] text-muted-foreground">
            Luồng luyện tập cho dạng này sẽ được triển khai ở bước sau của roadmap.
          </p>
        </div>
      </AppShell>
    );
  }

  const [questions, practicedSet, favoriteSet] = await Promise.all([
    getQuestionsForType(typeId, bank),
    getPracticedSet(userId, typeId),
    getFavoriteSet(userId, typeId),
  ]);

  if (questions.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-10 text-center sm:px-10">
          <h1 className="text-2xl font-semibold">{questionType.name}</h1>
          <p className="text-[15px] text-muted-foreground">
            {bank === "TU"
              ? "Chưa có câu hỏi nào trong bộ đề Tủ cho dạng này."
              : "Chưa có câu hỏi mẫu nào trong ngân hàng cho dạng này."}
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
          typeCode={questionType.code}
          questions={questions.map((q) => {
            const content = q.content as Record<string, unknown>;
            return {
              id: q.id,
              excerpt: questionExcerpt(content),
              difficulty: classifyDifficulty(typeId, extractQuestionText(content)),
            };
          })}
          practicedIds={Array.from(practicedSet)}
          favoriteIds={Array.from(favoriteSet)}
          weighting={questionType.weighting}
          bank={bank}
        />
      </WfdShell>
    </AppShell>
  );
}
