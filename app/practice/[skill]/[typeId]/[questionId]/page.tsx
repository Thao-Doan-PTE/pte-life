import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PracticeHeader } from "@/components/practice/practice-header";
import { renderPracticePlayer } from "@/components/practice/practice-player-switch";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { PRACTICE_INSTRUCTIONS } from "@/lib/practice-config";
import { getQuestionWithSiblings } from "@/lib/practice-queries";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { WfdProgressBar } from "@/components/wfd/wfd-progress-bar";
import { WfdPlayScreen } from "@/components/wfd/wfd-play-screen";
import { WfdBankCard, WfdTipsCard, WfdPearsonCard } from "@/components/wfd/wfd-sidebar-cards";
import { getStreakDays } from "@/lib/wfd-queries";

const VALID_SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export default async function PracticePlayerPage({
  params,
}: {
  params: Promise<{ skill: string; typeId: string; questionId: string }>;
}) {
  const { skill, typeId, questionId } = await params;

  if (!VALID_SKILLS.includes(skill as Skill)) {
    notFound();
  }

  const questionType = QUESTION_TYPES.find(
    (q) => q.id === typeId && q.skill === skill
  );
  if (!questionType) {
    notFound();
  }

  const instructions = PRACTICE_INSTRUCTIONS[typeId];
  if (!instructions) {
    notFound();
  }

  const { question, all, index } = await getQuestionWithSiblings(
    typeId,
    questionId
  );
  if (!question) {
    notFound();
  }

  const content = question.content as Record<string, unknown>;
  const prevHref =
    index > 0 ? `/practice/${skill}/${typeId}/${all[index - 1].id}` : null;
  const nextHref =
    index < all.length - 1
      ? `/practice/${skill}/${typeId}/${all[index + 1].id}`
      : null;
  const listHref = `/practice/${skill}/${typeId}`;

  const session = await auth();
  const streakDays = await getStreakDays(session!.user.id);

  if (typeId === "write-from-dictation") {
    return (
      <AppShell>
        <WfdShell>
          <WfdProgressBar pct={((index + 1) / all.length) * 100} />
          <WfdPlayScreen
            questionId={question.id}
            sentence={content.sentence as string}
            prevHref={prevHref}
            nextHref={nextHref}
            listHref={listHref}
            streakDays={streakDays}
            questionNumber={index + 1}
          />
        </WfdShell>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <WfdShell>
        <WfdProgressBar pct={((index + 1) / all.length) * 100} />
        <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            <PracticeHeader
              skill={skill as Skill}
              typeId={typeId}
              typeName={questionType.name}
              typeCode={questionType.code}
              descriptionVi={questionType.descriptionVi}
              questionCode={question.code}
              index={index}
              total={all.length}
              streakDays={streakDays}
            />
            {renderPracticePlayer(typeId, question.id, content, instructions)}

            <div
              className="flex items-center justify-between border-t pt-4"
              style={{ borderColor: "var(--wfd-border)" }}
            >
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--wfd-muted)" }}
                >
                  <ChevronLeft className="size-4" /> Câu trước
                </Link>
              ) : (
                <span />
              )}
              {nextHref ? (
                <Link
                  href={nextHref}
                  className="flex items-center gap-1 text-sm font-semibold"
                  style={{ color: "var(--wfd-muted)" }}
                >
                  Câu tiếp <ChevronRight className="size-4" />
                </Link>
              ) : (
                <span />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <WfdBankCard typeName={questionType.name} />
            <WfdTipsCard tips={[instructions.description]} />
            <WfdPearsonCard />
          </div>
        </div>
      </WfdShell>
    </AppShell>
  );
}
