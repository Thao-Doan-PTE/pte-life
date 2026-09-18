import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { WfdListenPractice } from "@/components/wfd/wfd-listen-practice";
import { getWfdQuestions } from "@/lib/wfd-queries";
import type { Skill } from "@/lib/question-types";

const VALID_SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export default async function WfdListenPracticePage({
  params,
}: {
  params: Promise<{ skill: string; typeId: string }>;
}) {
  const { skill, typeId } = await params;

  if (!VALID_SKILLS.includes(skill as Skill) || typeId !== "write-from-dictation") {
    notFound();
  }

  const questions = await getWfdQuestions();

  return (
    <AppShell>
      <WfdShell>
        <WfdListenPractice
          questions={questions.map((q) => {
            const content = q.content as Record<string, unknown>;
            return {
              id: q.id,
              sentence: content.sentence as string,
              sentenceVi: (content.sentenceVi as string | undefined) ?? null,
            };
          })}
        />
      </WfdShell>
    </AppShell>
  );
}
