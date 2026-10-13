import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ReviewStatus } from "@/lib/generated/prisma/enums";
import { DEFAULT_RUBRICS } from "@/lib/admin/rubrics";
import { ASSIGNABLE_CLASS_STATUSES } from "@/components/admin/assignments/assignment-meta";

type Db = Prisma.TransactionClient;

export interface AssignmentLink {
  assignmentId: string | null;
  reviewStatus: ReviewStatus | null;
}

const NO_LINK: AssignmentLink = { assignmentId: null, reviewStatus: null };

/** Bài tập ĐANG MỞ mà học viên còn phải làm: có tên trong danh sách phải nộp,
 * đang học (ACTIVE) ở lớp được giao, và lớp còn mở (đang học / sắp khai giảng).
 * Học viên đã chuyển/rời lớp, hoặc lớp đã kết thúc/lưu trữ, không còn gửi bài
 * mới cho giáo viên lớp đó. Dùng chung cho gắn bài nộp, bắt đầu Mock test được
 * giao và danh sách bài đang mở ở /bai-tap. */
export function studentOpenAssignmentWhere(userId: string): Prisma.AssignmentWhereInput {
  return {
    status: "OPEN",
    recipients: { some: { studentId: userId } },
    class: {
      status: { in: ASSIGNABLE_CLASS_STATUSES },
      enrollments: { some: { studentId: userId, status: "ACTIVE" } },
    },
  };
}

/** Dạng bài giáo viên chấm: có rubric mặc định trong code hoặc rubric đang dùng
 * trong DB (cùng quy tắc với getTeacherGradedTypeIds, nhưng chạy được trong
 * transaction để không mượn thêm kết nối khi đang giữ khoá). */
async function isTeacherGradedType(db: Db, questionTypeId: string): Promise<boolean> {
  if (Object.hasOwn(DEFAULT_RUBRICS, questionTypeId)) return true;
  return (await db.gradingRubric.count({ where: { questionTypeId, isActive: true } })) > 0;
}

/** Tự gắn bài làm của học viên vào bài tập được giao — làm ở server khi nộp
 * bài, nên không phải sửa từng trình phát đề và học viên không thể tự gắn bài
 * làm vào bài tập không phải của mình.
 * Quy tắc: câu hỏi nằm trong 1 bài tập ĐANG MỞ của lớp học viên đang học
 * (studentOpenAssignmentWhere), và học viên CHƯA nộp câu đó cho bài tập này
 * (chỉ lần nộp đầu tiên được tính là bài nộp; làm lại sau đó là tự luyện).
 * Nhiều bài tập cùng chứa câu này: ưu tiên `preferredAssignmentId` (bài tập của
 * lượt Mock test đang làm — đã kiểm tra ở server) nếu còn hợp lệ, không thì bài
 * có hạn nộp sớm nhất.
 * Chỉ đọc — muốn "lần nộp đầu tiên" chính xác khi nộp đồng thời thì gọi qua
 * createAttemptWithAssignmentLink (khoá theo học viên + câu hỏi). */
export async function resolveAssignmentLink(
  userId: string,
  questionId: string,
  questionTypeId: string,
  options: { tx?: Db; preferredAssignmentId?: string | null } = {}
): Promise<AssignmentLink> {
  const db = options.tx ?? prisma;
  const items = await db.assignmentItem.findMany({
    where: { questionId, assignment: studentOpenAssignmentWhere(userId) },
    select: { assignmentId: true, assignment: { select: { dueAt: true, createdAt: true } } },
  });
  if (items.length === 0) return NO_LINK;

  const alreadySubmitted = await db.practiceAttempt.findMany({
    where: { userId, questionId, assignmentId: { in: items.map((i) => i.assignmentId) } },
    select: { assignmentId: true },
  });
  const done = new Set(alreadySubmitted.map((a) => a.assignmentId));
  const open = items.filter((i) => !done.has(i.assignmentId));
  const candidate =
    open.find((i) => options.preferredAssignmentId != null && i.assignmentId === options.preferredAssignmentId) ??
    open.sort(
      (a, b) =>
        (a.assignment.dueAt?.getTime() ?? Infinity) - (b.assignment.dueAt?.getTime() ?? Infinity) ||
        a.assignment.createdAt.getTime() - b.assignment.createdAt.getTime()
    )[0];
  if (!candidate) return NO_LINK;

  return {
    assignmentId: candidate.assignmentId,
    reviewStatus: (await isTeacherGradedType(db, questionTypeId)) ? "PENDING" : null,
  };
}

/** Đánh dấu học viên đã hoàn thành bài tập khi đã nộp đủ mọi câu. Trong
 * transaction thì khoá dòng AssignmentRecipient trước khi đếm: 2 câu cuối nộp
 * cùng lúc sẽ chạy lần lượt, câu sau thấy câu trước đã lưu nên không bỏ sót. */
export async function updateRecipientCompletion(
  assignmentId: string,
  userId: string,
  tx?: Db
): Promise<void> {
  const db = tx ?? prisma;
  if (tx) {
    await tx.$executeRaw`SELECT 1 FROM "AssignmentRecipient" WHERE "assignmentId" = ${assignmentId} AND "studentId" = ${userId} FOR UPDATE`;
  }
  const itemCount = await db.assignmentItem.count({ where: { assignmentId } });
  const submitted = await db.practiceAttempt.findMany({
    where: { assignmentId, userId },
    select: { questionId: true },
    distinct: ["questionId"],
  });
  if (itemCount > 0 && submitted.length >= itemCount) {
    await db.assignmentRecipient.updateMany({
      where: { assignmentId, studentId: userId, completedAt: null },
      data: { completedAt: new Date() },
    });
  }
}

/** Trang luyện tập / Mock test (server) tính trước: câu Speaking này có đang là
 * bài nộp chờ giáo viên chấm không (bài tập đang mở của lớp đang học, học viên
 * chưa nộp, dạng bài có rubric giáo viên) — chỉ khi đó trình duyệt mới gửi kèm
 * file ghi âm (collectAudio). Chỉ là gợi ý để tiết kiệm băng thông: lúc nộp
 * server vẫn tự tra lại và tự quyết định có lưu file hay không. */
export async function shouldCollectAssignmentAudio(
  userId: string,
  questionId: string,
  questionTypeId: string
): Promise<boolean> {
  try {
    return (await resolveAssignmentLink(userId, questionId, questionTypeId)).reviewStatus === "PENDING";
  } catch (error) {
    // Không tra được thì vẫn gửi kèm (server sẽ bỏ file nếu không cần) — thà tốn
    // băng thông còn hơn mất bản ghi âm giáo viên cần nghe.
    console.error("[assignment-link] Không tra được bài tập để quyết định gửi ghi âm", error);
    return true;
  }
}

/** Bài tập của lượt Mock test được giao mà học viên đang làm — dùng làm
 * `preferredAssignmentId`. Chỉ nhận khi lượt thi là của chính học viên, đang
 * làm dở, có gắn bài tập và có chứa câu hỏi này; còn lại trả null (không bao
 * giờ tin id do trình duyệt gửi lên). */
export async function getMockSessionAssignmentId(
  userId: string,
  sessionId: unknown,
  questionId: string
): Promise<string | null> {
  if (typeof sessionId !== "string" || sessionId.length === 0 || sessionId.length > 64) return null;
  try {
    const session = await prisma.mockTestSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: "in_progress",
        assignmentId: { not: null },
        questionIds: { has: questionId },
      },
      select: { assignmentId: true },
    });
    return session?.assignmentId ?? null;
  } catch (error) {
    console.error("[assignment-link] Không đọc được lượt Mock test", error);
    return null;
  }
}

type AttemptData = Omit<
  Prisma.PracticeAttemptUncheckedCreateInput,
  "userId" | "questionId" | "questionTypeId" | "assignmentId" | "reviewStatus"
>;

/** Lưu 1 lượt làm bài và gắn vào bài tập được giao trong CÙNG 1 transaction:
 * khoá theo (học viên, câu hỏi) → tra lại bài tập (kiểm tra "lần nộp đầu tiên"
 * khi đã giữ khoá) → tạo lượt làm → cập nhật tiến độ bài tập. 2 lần nộp đồng
 * thời cùng 1 câu (2 tab/2 máy) không thể cùng thành bài nộp PENDING.
 * Gọi SAU khi chấm AI xong — không giữ transaction trong lúc chờ AI.
 * Lỗi khi gắn bài tập không bao giờ làm hỏng việc lưu bài của học viên: khi đó
 * bài được lưu như tự luyện. */
export async function createAttemptWithAssignmentLink(
  input: { userId: string; questionId: string; questionTypeId: string; preferredAssignmentId?: string | null },
  data: AttemptData
): Promise<AssignmentLink & { attemptId: string }> {
  const { userId, questionId, questionTypeId, preferredAssignmentId } = input;
  const run = () =>
    prisma.$transaction(async (tx) => {
      const lockKey = `${userId}:${questionId}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}::text))`;
      const link = await resolveAssignmentLink(userId, questionId, questionTypeId, { tx, preferredAssignmentId });
      const attempt = await tx.practiceAttempt.create({
        select: { id: true },
        data: { ...data, userId, questionId, questionTypeId, ...link },
      });
      if (link.assignmentId) await updateRecipientCompletion(link.assignmentId, userId, tx);
      return { ...link, attemptId: attempt.id };
    }, { maxWait: 10_000, timeout: 15_000 });
  try {
    try {
      return await run();
    } catch (error) {
      // Lỗi tạm thời (hết thời gian chờ kết nối, xung đột/deadlock) → thử lại 1 lần.
      const code = (error as { code?: string })?.code;
      if (code !== "P2028" && code !== "P2034" && !/40P01|40001/.test(String((error as Error)?.message))) throw error;
      return await run();
    }
  } catch (error) {
    console.error("[assignment-link] Không gắn được bài nộp vào bài tập — lưu như tự luyện", error);
    const attempt = await prisma.practiceAttempt.create({
      select: { id: true },
      data: { ...data, userId, questionId, questionTypeId, ...NO_LINK },
    });
    return { ...NO_LINK, attemptId: attempt.id };
  }
}
