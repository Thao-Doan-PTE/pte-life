"use server";

import { requirePracticeAccess } from "@/lib/practice-access";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { submitAttemptAction } from "@/lib/actions/practice";
import { computeGseScores, type GseBreakdown } from "@/lib/gse-scoring";
import { isClassAssignable } from "@/components/admin/assignments/assignment-meta";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function requireUser() {
  return requirePracticeAccess();
}

export async function createQuestionTestSession(formData: FormData) {
  const questionTypeId = formData.get("questionTypeId") as string;
  const randomize = formData.get("randomize") === "true";
  const count = Number(formData.get("count")) || undefined;
  const user = await requireUser();
  const questions = await prisma.question.findMany({
    where: { questionTypeId, availableIn: { has: user.examPackage }, archivedAt: null },
    orderBy: { code: "asc" },
  });
  if (questions.length === 0) {
    throw new Error("Chưa có câu hỏi nào cho dạng này trong gói học của bạn.");
  }

  let ordered = questions;
  if (randomize) {
    // "Trộn đề" ưu tiên câu chưa làm: xáo trộn riêng 2 nhóm chưa làm/đã làm rồi
    // nối chưa làm lên trước, thay vì xáo trộn đều cả bộ.
    const attempted = await prisma.practiceAttempt.findMany({
      where: { userId: user.id, questionTypeId },
      select: { questionId: true },
      distinct: ["questionId"],
    });
    const doneIds = new Set(attempted.map((a) => a.questionId));
    const notDone = questions.filter((q) => !doneIds.has(q.id));
    const done = questions.filter((q) => doneIds.has(q.id));
    ordered = [...shuffle(notDone), ...shuffle(done)];
  }
  const limited = count ? ordered.slice(0, count) : ordered;
  const questionType = QUESTION_TYPES.find((q) => q.id === questionTypeId);

  const session = await prisma.mockTestSession.create({
    data: {
      userId: user.id,
      mode: "question",
      skill: questionType?.skill,
      questionTypeId,
      questionIds: limited.map((q) => q.id),
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
      where: { questionTypeId: type.id, availableIn: { has: user.examPackage }, archivedAt: null },
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

/** Thứ tự đúng cấu trúc thi thật: Speaking & Writing (gộp 1 phần) → Reading → Listening. */
const FULL_TEST_SKILL_ORDER: Skill[] = ["speaking", "writing", "reading", "listening"];

export async function createFullTestSession(formData: FormData) {
  const randomize = formData.get("randomize") === "true";
  const user = await requireUser();
  const types = FULL_TEST_SKILL_ORDER.flatMap((skill) =>
    QUESTION_TYPES.filter((t) => t.skill === skill && t.availableIn.includes(user.examPackage))
  );

  const questionIds: string[] = [];
  for (const type of types) {
    const questions = await prisma.question.findMany({
      where: { questionTypeId: type.id, availableIn: { has: user.examPackage }, archivedAt: null },
      orderBy: { code: "asc" },
    });
    if (questions.length === 0) continue;
    const picked = randomize ? questions[Math.floor(Math.random() * questions.length)] : questions[0];
    questionIds.push(picked.id);
  }

  if (questionIds.length === 0) {
    throw new Error("Chưa có câu hỏi nào trong gói học của bạn để tạo đề thi thử.");
  }

  const session = await prisma.mockTestSession.create({
    data: {
      userId: user.id,
      mode: "full",
      questionIds,
    },
  });

  redirect(`/mocktest/session/${session.id}`);
}

/** 2 dạng "khó đoán trước đề" mà bộ Tủ tập trung — xem prisma/schema.prisma (QuestionBank). */
const TU_BANK_TYPE_IDS = ["write-from-dictation", "repeat-sentence"];

export async function createTuMockTestSession(formData: FormData) {
  const randomize = formData.get("randomize") === "true";
  const user = await requireUser();
  const questions = await prisma.question.findMany({
    where: {
      questionTypeId: { in: TU_BANK_TYPE_IDS },
      bank: "TU",
      archivedAt: null,
      availableIn: { has: user.examPackage },
    },
    orderBy: { code: "asc" },
  });

  if (questions.length === 0) {
    throw new Error("Chưa có câu hỏi nào trong bộ đề Tủ cho gói học của bạn.");
  }

  const ordered = randomize ? shuffle(questions) : questions;

  const session = await prisma.mockTestSession.create({
    data: {
      userId: user.id,
      mode: "tu",
      questionIds: ordered.map((q) => q.id),
    },
  });

  redirect(`/mocktest/session/${session.id}`);
}

/** Học viên làm bài tập dạng Mock test được giao: tạo 1 lượt Mock test gồm đúng
 * các câu của bài tập (theo thứ tự giáo viên sắp), gắn assignmentId. Bài nộp
 * trong lượt thi tự gắn vào bài tập ở server (lib/admin/assignment-link.ts).
 * Đang có lượt làm dở của chính bài tập này thì mở lại lượt đó thay vì tạo mới. */
export async function startAssignmentMockAction(assignmentId: string): Promise<{ error: string }> {
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Bạn không có quyền thực hiện thao tác này." };
  }
  if (typeof assignmentId !== "string" || assignmentId.length === 0 || assignmentId.length > 64) {
    return { error: "Không tìm thấy bài tập." };
  }

  // Chỉ bài tập của lớp học viên ĐANG học: học viên đã chuyển/rời lớp không làm
  // tiếp Mock test của lớp cũ (bài nộp sẽ không còn gắn vào bài tập đó).
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      recipients: { some: { studentId: user.id } },
      class: { enrollments: { some: { studentId: user.id, status: "ACTIVE" } } },
    },
    select: {
      id: true,
      kind: true,
      status: true,
      class: { select: { status: true } },
      items: {
        orderBy: { position: "asc" },
        select: { questionId: true, question: { select: { questionTypeId: true } } },
      },
    },
  });
  if (!assignment) return { error: "Không tìm thấy bài tập." };
  if (assignment.kind !== "MOCK") return { error: "Bài tập này không phải Mock test." };
  // Lớp đã kết thúc/lưu trữ: bài tập coi như đã đóng (cùng quy tắc với
  // resolveAssignmentLink — studentOpenAssignmentWhere).
  if (assignment.status !== "OPEN" || !isClassAssignable(assignment.class.status)) {
    return { error: "Bài tập đã đóng, không làm Mock test được nữa." };
  }
  if (assignment.items.length === 0) return { error: "Bài tập chưa có câu hỏi nào." };

  const existing = await prisma.mockTestSession.findFirst({
    where: { userId: user.id, assignmentId: assignment.id, status: "in_progress" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (existing) redirect(`/mocktest/session/${existing.id}`);

  // Cùng 1 dạng → ghi rõ dạng/kỹ năng (nhãn "Question Test — …" ở trang kết quả);
  // nhiều dạng → để trống, nhãn chung "Mocktest". Không dùng mode "full" vì mode
  // đó tính điểm GSE như cả bài thi thật.
  const typeIds = [...new Set(assignment.items.map((i) => i.question.questionTypeId))];
  const types = typeIds.map((id) => QUESTION_TYPES.find((t) => t.id === id));
  const skills = [...new Set(types.map((t) => t?.skill))];
  const session = await prisma.mockTestSession.create({
    data: {
      userId: user.id,
      mode: "question",
      questionTypeId: typeIds.length === 1 ? typeIds[0] : null,
      skill: skills.length === 1 ? skills[0] : undefined,
      questionIds: assignment.items.map((i) => i.questionId),
      assignmentId: assignment.id,
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

    // Full Mock Test mô phỏng cả bài thi thật nên chấm theo đúng chuẩn Pearson
    // (GSE 10-90, có trọng số + integrated skills routing) thay vì trung bình
    // cộng % đơn giản — xem lib/gse-scoring.ts. Question/Section Test vẫn dùng
    // scorePct như cũ vì chỉ luyện 1 phần, không đại diện cho "cả bài thi".
    let gse: GseBreakdown | null = null;
    if (session.mode === "full" && latestByQuestion.size > 0) {
      const questions = await prisma.question.findMany({
        where: { id: { in: [...latestByQuestion.keys()] } },
        select: { id: true, questionTypeId: true },
      });
      const typeByQuestion = new Map(questions.map((q) => [q.id, q.questionTypeId]));
      const entries = [...latestByQuestion.entries()]
        .map(([questionId, score]) => {
          const questionTypeId = typeByQuestion.get(questionId);
          return questionTypeId ? { questionTypeId, scorePct: score } : null;
        })
        .filter((e): e is { questionTypeId: string; scorePct: number } => e !== null);
      gse = computeGseScores(entries);
    }

    await prisma.mockTestSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        completedAt: new Date(),
        scorePct,
        overallScore: gse?.overall,
        listeningScore: gse?.listening,
        readingScore: gse?.reading,
        speakingScore: gse?.speaking,
        writingScore: gse?.writing,
      },
    });
    redirect(`/mocktest/session/${sessionId}/result`);
  }

  await prisma.mockTestSession.update({
    where: { id: sessionId },
    data: { currentIndex: nextIndex },
  });
  redirect(`/mocktest/session/${sessionId}`);
}

/** Dùng cho khung "giao diện thi thật": nút Next duy nhất vừa lưu câu trả lời
 * (nếu form có field "answer") vừa chuyển câu, không cần nút Nộp bài riêng
 * như bản luyện tập thường. Field "answer" có thể là chuỗi thường (WFD,
 * Writing) hoặc chuỗi JSON (mảng lựa chọn MCQ, object điền chỗ trống, mảng
 * thứ tự đoạn văn...) — tự nhận diện qua JSON.parse, parse lỗi thì coi là
 * chuỗi thường. Các dạng chưa có field "answer" (tự nộp bài qua cơ chế AI
 * chấm điểm riêng của player, ví dụ Speaking) chỉ đơn giản chuyển câu như cũ. */
export async function submitMockAnswerAndAdvance(
  sessionId: string,
  questionId: string,
  formData: FormData
) {
  const raw = formData.get("answer");
  if (typeof raw === "string" && raw.trim().length > 0) {
    let response: unknown = raw;
    try {
      response = JSON.parse(raw);
    } catch {
      // Không phải JSON — dùng nguyên chuỗi (WFD, Writing).
    }
    // Truyền sessionId để bài nộp trong lượt Mock test được giao gắn vào đúng bài
    // tập của lượt đó — submitAttemptAction tự kiểm tra lượt thi thuộc học viên,
    // đang làm dở và có gắn bài tập (không tin tham số này).
    await submitAttemptAction(questionId, response, 0, sessionId);
  }
  await advanceMockTestSession(sessionId);
}

export async function deleteMockTestSession(sessionId: string) {
  const user = await requireUser();
  await prisma.mockTestSession.deleteMany({
    where: { id: sessionId, userId: user.id },
  });
}
