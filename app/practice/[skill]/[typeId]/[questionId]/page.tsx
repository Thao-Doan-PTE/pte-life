import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { PracticeHeader } from "@/components/practice/practice-header";
import { PracticeNavFooter } from "@/components/practice/practice-nav-footer";
import { ExamSimulationToggle } from "@/components/practice/exam-simulation-toggle";
import { FavoriteStarButton } from "@/components/practice/favorite-star-button";
import { renderPracticePlayer } from "@/components/practice/practice-player-switch";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { PRACTICE_INSTRUCTIONS, AUDIO_TASK_TYPE_IDS, NEW_HEADER_TYPE_IDS } from "@/lib/practice-config";
import { getQuestionWithSiblings, isFavorited } from "@/lib/practice-queries";
import { extractQuestionText } from "@/lib/question-excerpt";
import { classifyDifficulty } from "@/lib/difficulty";
import { DifficultyBadge } from "@/components/practice/difficulty-badge";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { WfdProgressBar } from "@/components/wfd/wfd-progress-bar";
import { WfdPlayScreen } from "@/components/wfd/wfd-play-screen";
import { WfdTipsCard } from "@/components/wfd/wfd-sidebar-cards";
import { getStreakDays } from "@/lib/wfd-queries";
import { requireClassStudent } from "@/lib/require-class-student";
import { shouldCollectAssignmentAudio } from "@/lib/admin/assignment-link";

const VALID_SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export default async function PracticePlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ skill: string; typeId: string; questionId: string }>;
  searchParams: Promise<{ bank?: string }>;
}) {
  // Chặn ở từng trang (không chỉ ở layout): khi chuyển trang phía trình duyệt,
  // Next.js có thể bỏ qua layout đã có sẵn.
  await requireClassStudent();
  const { skill, typeId, questionId } = await params;
  const { bank: bankParam } = await searchParams;
  const bank = bankParam === "TU" ? "TU" : undefined;
  const bankQuery = bank ? `?bank=${bank}` : "";

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
    questionId,
    bank
  );
  if (!question) {
    notFound();
  }

  const content = question.content as Record<string, unknown>;
  const prevHref =
    index > 0 ? `/practice/${skill}/${typeId}/${all[index - 1].id}${bankQuery}` : null;
  const nextHref =
    index < all.length - 1
      ? `/practice/${skill}/${typeId}/${all[index + 1].id}${bankQuery}`
      : null;
  const listHref = `/practice/${skill}/${typeId}${bankQuery}`;
  const difficulty = classifyDifficulty(typeId, extractQuestionText(content));

  const session = await auth();
  const streakDays = await getStreakDays(session!.user.id);
  const favorited = await isFavorited(session!.user.id, question.id);
  // Speaking: chỉ gửi kèm file ghi âm khi câu này đang là bài nộp chờ giáo viên
  // chấm (bài tập đang mở của lớp đang học, chưa nộp) — tự luyện không tải file
  // lên vô ích. Server vẫn tự kiểm tra lại lúc nộp.
  const collectAudio =
    skill === "speaking"
      ? await shouldCollectAssignmentAudio(session!.user.id, question.id, question.questionTypeId)
      : false;

  const simpleNav = (
    <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--wfd-border)" }}>
      {prevHref ? (
        <Link
          href={prevHref}
          className="flex items-center gap-1 rounded-lg border px-4 py-2 text-[15px] font-semibold transition-colors hover:bg-[var(--wfd-bg)]"
          style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-muted)", background: "var(--wfd-surface)" }}
        >
          <ChevronLeft className="size-4" /> Câu trước
        </Link>
      ) : (
        <span />
      )}
      {nextHref ? (
        <Link
          href={nextHref}
          className="flex items-center gap-1 rounded-lg border px-4 py-2 text-[15px] font-semibold transition-colors hover:bg-[var(--wfd-bg)]"
          style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-muted)", background: "var(--wfd-surface)" }}
        >
          Câu tiếp theo <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );

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
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_320px]">
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
            {NEW_HEADER_TYPE_IDS.has(typeId) ? (
              (() => {
                const card = (
                  <div
                    className="flex flex-col gap-4 rounded-2xl border p-5"
                    style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
                  >
                    <div
                      className="flex flex-wrap items-center justify-between gap-2 border-b pb-4"
                      style={{ borderColor: "var(--wfd-border)" }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="wfd-mono rounded-full px-3 py-1 text-[13px] font-bold"
                          style={{ background: "var(--wfd-black-tint)", color: "var(--wfd-ink)" }}
                        >
                          #{question.code}
                        </span>
                        <DifficultyBadge level={difficulty} />
                      </div>
                      <FavoriteStarButton questionId={question.id} initialFavorited={favorited} />
                    </div>
                    {renderPracticePlayer(typeId, question.id, content, instructions, { collectAudio })}
                  </div>
                );

                return AUDIO_TASK_TYPE_IDS.has(typeId) ? (
                  <PracticeNavFooter prevHref={prevHref} nextHref={nextHref}>
                    {card}
                  </PracticeNavFooter>
                ) : (
                  <>
                    {card}
                    {simpleNav}
                  </>
                );
              })()
            ) : (
              <>
                {renderPracticePlayer(typeId, question.id, content, instructions, { collectAudio })}
                {simpleNav}
              </>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <ExamSimulationToggle questionTypeId={typeId} />
            <WfdTipsCard
              title={
                typeId === "repeat-sentence"
                  ? "Mẹo cho Repeat Sentence (RS)"
                  : typeId === "read-aloud"
                    ? "Mẹo làm bài RA"
                    : undefined
              }
              tips={
                typeId === "read-aloud"
                  ? [
                      "Dùng 35s chuẩn bị để đánh dấu chỗ ngắt hơi (dấu phẩy, mệnh đề).",
                      "Fluency quan trọng hơn từng từ: đừng dừng lại sửa lỗi.",
                      "Giữ tốc độ đều ~ 2.5 từ/giây, nhấn trọng âm từ khoá.",
                    ]
                  : typeId === "repeat-sentence"
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
            {typeId === "read-aloud" && (
              <div
                className="flex flex-col gap-1 rounded-xl border p-4"
                style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
              >
                <p className="text-[13px] font-semibold">Phím tắt</p>
                <p className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--wfd-muted)" }}>
                  <span
                    className="wfd-mono rounded-md border px-1.5 py-0.5 text-[13px]"
                    style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
                  >
                    Space
                  </span>
                  Bắt đầu / dừng ghi âm
                </p>
                <p className="text-[13px]" style={{ color: "var(--wfd-muted)" }}>
                  Bôi đen hoặc nhấp đúp một từ để tra nghĩa.
                </p>
              </div>
            )}
          </div>
        </div>
      </WfdShell>
    </AppShell>
  );
}
