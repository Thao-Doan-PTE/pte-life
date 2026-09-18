"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Bạn cần đăng nhập.");
  }
  return session.user;
}

export async function createQuestionTestSession(formData: FormData) {
  const questionTypeId = formData.get("questionTypeId") as string;
  const randomize = formData.get("randomize") === "true";
  const user = await requireUser();
  const questions = await prisma.question.findMany({
    where: { questionTypeId, availableIn: { has: user.examPackage } },
    orderBy: { code: "asc" },
  });
  if (questions.length === 0) {
    throw new Error("Chưa có câu hỏi nào cho dạng này trong gói học của bạn.");
  }
  const ordered = randomize ? shuffle(questions) : questions;
  const questionType = QUESTION_TYPES.find((q) => q.id === questionTypeId);

  const session = await prisma.mockTestSession.create({
    data: {
      userId: user.id,
      mode: "question",
      skill: questionType?.skill,
      questionTypeId,
      questionIds: ordered.map((q) => q.id),
    },
  });

  redirect(`/mocktest/session/${session.id}`);
}

export async function createSectionTestSession(formData: FormData) {
  const skill = formData.get("skill") as Skill;
  const randomize = formData.get("randomize") === "true";
  const user = await requireUser();
  const typesInSkill = QUESTION_TYPES.filter(
    (t) => t.skill === skill && t.availableIn.includes(user.examPackage)
  );

  const questionIds: string[] = [];
  for (const type of typesInSkill) {
    const question = await prisma.question.findFirst({
      where: { questionTypeId: type.id, availableIn: { has: user.examPackage } },
      orderBy: { code: "asc" },
    });
    if (question) questionIds.push(question.id);
  }

  if (questionIds.length === 0) {
    throw new Error("Chưa có câu hỏi nào cho phần thi này trong gói học của bạn.");
  }

  const ordered = randomize ? shuffle(questionIds) : questionIds;

  const session = await prisma.mockTestSession.create({
    data: {
      userId: user.id,
      mode: "section",
      skill,
      questionIds: ordered,
    },
  });

  redirect(`/mocktest/session/${session.id}`);
}

export async function advanceMockTestSession(sessionId: string) {
  const user = await requireUser();
  const session = await prisma.mockTestSession.findFirstOrThrow({
    where: { id: sessionId, userId: user.id },
  });

  const nextIndex = session.currentIndex + 1;

  if (nextIndex >= session.questionIds.length) {
    const attempts = await prisma.practiceAttempt.findMany({
      where: {
        userId: user.id,
        questionId: { in: session.questionIds },
        createdAt: { gte: session.startedAt },
      },
      orderBy: { createdAt: "desc" },
    });
    const latestByQuestion = new Map<string, number>();
    for (const a of attempts) {
      if (!latestByQuestion.has(a.questionId)) {
        latestByQuestion.set(a.questionId, a.scorePct);
      }
    }
    const scores = [...latestByQuestion.values()];
    const scorePct =
      scores.length > 0
        ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
        : null;

    await prisma.mockTestSession.update({
      where: { id: sessionId },
      data: { status: "completed", completedAt: new Date(), scorePct },
    });
    redirect(`/mocktest/session/${sessionId}/result`);
  }

  await prisma.mockTestSession.update({
    where: { id: sessionId },
    data: { currentIndex: nextIndex },
  });
  redirect(`/mocktest/session/${sessionId}`);
}

export async function deleteMockTestSession(sessionId: string) {
  const user = await requireUser();
  await prisma.mockTestSession.deleteMany({
    where: { id: sessionId, userId: user.id },
  });
}
