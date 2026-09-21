import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PracticeHeader } from "@/components/practice/practice-header";
import { PracticeNavFooter } from "@/components/practice/practice-nav-footer";
import { renderPracticePlayer } from "@/components/practice/practice-player-switch";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { PRACTICE_INSTRUCTIONS, AUDIO_TASK_TYPE_IDS } from "@/lib/practice-config";
import { getQuestionWithSiblings, isFavorited } from "@/lib/practice-queries";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { WfdProgressBar } from "@/components/wfd/wfd-progress-bar";
import { WfdPlayScreen } from "@/components/wfd/wfd-play-screen";
import { WfdBankCard, WfdTipsCard } from "@/components/wfd/wfd-sidebar-cards";
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
  const favorited = await isFavorited(session!.user.id, question.id);

  if (typeId === "write-from-dictation") {
    return (
      <AppShell>
        <WfdShell>
          <WfdProgressBar pct={((index + 1) / all.length) * 100} />
          <WfdPlayScreen
            questionId={question.id}
            questionCode={question.code}
            sentence={content.sentence as string}
            prevHref={prevHref}
            nextHref={nextHref}
            listHref={listHref}
            streakDays={streakDays}
            questionNumber={index + 1}
            total={all.length}
            isFavorited={favorited}
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
              instructionText={
                typeId === "repeat-sentence" ? (
                  <>
                    Nghe câu mẫu → Sau tiếng &quot;<b>BEEP</b>&quot;, mic sẽ tự động bật → Hãy đọc lại câu ngay nhé!
                  </>
                ) : (
                  instructions.description
                )
              }
              questionId={question.id}
              questionCode={question.code}
              index={index}
              total={all.length}
              streakDays={streakDays}
              isFavorited={favorited}
            />
            {AUDIO_TASK_TYPE_IDS.has(typeId) ? (
              <PracticeNavFooter prevHref={prevHref} nextHref={nextHref}>
                {renderPracticePlayer(typeId, question.id, content, instructions)}
              </PracticeNavFooter>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <WfdBankCard typeName={questionType.name} />
            <WfdTipsCard
              title={typeId === "repeat-sentence" ? "Mẹo cho Repeat Sentence (RS)" : undefined}
              tips={
                typeId === "repeat-sentence"
                  ? [
                      <span key="1">
                        <b>Nói ngay là yếu tố sống còn:</b> Nghe xong là nói liền, đừng dừng lại suy nghĩ.
                      </span>,
                      <span key="2">
                        <b>Không có thời gian chuẩn bị:</b> Audio vừa dứt, micro ghi âm ngay lập tức.
                      </span>,
                      <span key="3">
                        <b>Im lặng 3 giây là mất điểm:</b> Micro tự tắt nếu bạn không nói gì trong 3 giây, và câu đó bị tính là mất điểm.
                      </span>,
                    ]
                  : [instructions.description]
              }
            />
          </div>
        </div>
      </WfdShell>
    </AppShell>
  );
}
