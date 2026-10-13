"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireCapability } from "@/lib/admin/permissions";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { QUESTION_TYPES, type ExamPackage, type QuestionType, type Skill } from "@/lib/question-types";
import type { QuestionBank } from "@/lib/generated/prisma/client";
import type { Role } from "@/lib/generated/prisma/enums";
import { QUESTION_IMPORT_SCHEMAS, parseAvailableIn } from "@/lib/question-import/schemas";
import { parseCsv, csvRowsToRecords } from "@/lib/question-import/csv";

/** File "use server": mọi hàm export đều là endpoint HTTP công khai — hàm đọc
 * yêu cầu quyền xem ngân hàng đề (Admin, Trưởng học thuật, Giáo viên), hàm
 * nhập/xoá yêu cầu quyền sửa (chỉ Admin, như trước). */

export interface QuestionTypeCount {
  questionTypeId: string;
  skill: Skill;
  name: string;
  code: string;
  availableIn: ExamPackage[];
  /** Tổng số câu đang dùng (cả PTE + Tủ) — KHÔNG tính câu đã ẩn (archivedAt). */
  count: number;
  /** Số câu đang dùng thuộc ngân hàng Luyện đề Tủ (Question.bank = TU). */
  tuCount: number;
  /** Số câu đã ẩn (cả PTE + Tủ). */
  archivedCount: number;
  /** Số câu đã ẩn thuộc ngân hàng Luyện đề Tủ. */
  archivedTuCount: number;
}

/** Số câu theo từng dạng — 1 truy vấn groupBy theo [dạng, ngân hàng];
 * `_count.archivedAt` đếm số câu có archivedAt khác null (= câu đã ẩn). */
export async function getQuestionCounts(): Promise<QuestionTypeCount[]> {
  await requireCapability("viewQuestionBank");
  const rows = await prisma.question.groupBy({
    by: ["questionTypeId", "bank"],
    _count: { _all: true, archivedAt: true },
  });
  const empty = { count: 0, tuCount: 0, archivedCount: 0, archivedTuCount: 0 };
  const totals = new Map<string, typeof empty>();
  for (const row of rows) {
    const entry = totals.get(row.questionTypeId) ?? { ...empty };
    const archived = row._count.archivedAt;
    const active = row._count._all - archived;
    entry.count += active;
    entry.archivedCount += archived;
    if (row.bank === "TU") {
      entry.tuCount += active;
      entry.archivedTuCount += archived;
    }
    totals.set(row.questionTypeId, entry);
  }
  return QUESTION_TYPES.map((t: QuestionType) => ({
    questionTypeId: t.id,
    skill: t.skill,
    name: t.name,
    code: t.code,
    availableIn: t.availableIn,
    ...(totals.get(t.id) ?? empty),
  }));
}

/** Câu của 1 dạng cho trang quản lý. Mặc định bỏ câu đã ẩn; `includeArchived`
 * = true thì trả cả câu đã ẩn (xếp sau câu đang dùng). `_count.assignmentItems`
 * > 0 = câu đang nằm trong bài tập (xoá sẽ thành ẩn). */
export async function getQuestionsForTypeAdmin(
  questionTypeId: string,
  bank?: QuestionBank,
  includeArchived = false
) {
  await requireCapability("viewQuestionBank");
  return prisma.question.findMany({
    where: { questionTypeId, ...(bank ? { bank } : {}), ...(includeArchived === true ? {} : { archivedAt: null }) },
    orderBy: [{ archivedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    select: {
      id: true,
      code: true,
      availableIn: true,
      bank: true,
      createdAt: true,
      archivedAt: true,
      _count: { select: { assignmentItems: true } },
    },
  });
}

function typeLabel(questionTypeId: string): string {
  const t = QUESTION_TYPES.find((q) => q.id === questionTypeId);
  return t ? `${t.code} — ${t.name}` : questionTypeId;
}

function revalidateQuestionPages(questionTypeId: string) {
  revalidatePath(`/admin/questions?type=${questionTypeId}`);
  // Trang tổng (thẻ tổng + bảng dạng bài) cũng hiển thị số câu.
  revalidatePath("/admin/questions");
}

/** Kết quả xoá / khôi phục câu hỏi cho form dùng useActionState. */
export type QuestionDeleteState = { error?: string; success?: string } | null;

interface QuestionDeleteOutcome {
  deleted: number;
  archived: number;
  /** Thông báo hiển thị cho người dùng. */
  message: string;
}

/** Lỗi khoá ngoại (câu vừa được thêm vào bài tập giữa lúc kiểm tra và lúc xoá). */
function isForeignKeyError(e: unknown): boolean {
  const err = e as { code?: string; message?: string; cause?: { code?: string } } | null;
  return err?.code === "P2003" || err?.cause?.code === "23503" || /foreign key/i.test(err?.message ?? "");
}

/** Xoá câu hỏi. AssignmentItem.question là onDelete Restrict: câu đang nằm trong
 * bài tập KHÔNG xoá hẳn được, nên những câu đó được ẩn (archivedAt = now) thay vì
 * xoá; các câu còn lại xoá như cũ. Kiểm tra + xoá/ẩn + nhật ký trong 1 transaction. */
async function deleteOrArchiveQuestions(
  admin: { id: string; roles: Role[] },
  ids: string[],
  questionTypeId: string,
  mode: "single" | "bulk"
): Promise<QuestionDeleteOutcome> {
  const actor = { id: admin.id, roles: admin.roles };
  // Nhật ký xoá nhiều câu ghi theo dạng câu hỏi (entityId + nhãn dạng) → bắt buộc
  // có dạng hợp lệ, và chỉ xoá các câu thuộc đúng dạng đó (form cũ/giả mạo gửi id
  // của dạng khác sẽ không bị xoá, nhật ký không ghi sai dạng).
  if (questionTypeId && !QUESTION_TYPES.some((t) => t.id === questionTypeId)) {
    return { deleted: 0, archived: 0, message: "Dạng câu hỏi không hợp lệ." };
  }
  if (mode === "bulk" && !questionTypeId) {
    return { deleted: 0, archived: 0, message: "Thiếu dạng câu hỏi cần xoá." };
  }
  try {
    return await prisma.$transaction(async (tx) => {
      // Khoá các câu sắp xoá: thao tác giao bài thêm câu vào bài tập cùng lúc phải
      // chờ, nên kết quả kiểm tra "đang nằm trong bài tập" bên dưới không bị lỗi thời.
      await tx.$queryRaw`SELECT "id" FROM "Question" WHERE "id" = ANY(${ids}) FOR UPDATE`;

      const targets = await tx.question.findMany({
        where: { id: { in: ids }, ...(questionTypeId ? { questionTypeId } : {}) },
        select: { id: true, code: true, questionTypeId: true, bank: true, availableIn: true, archivedAt: true },
      });
      if (targets.length === 0) return { deleted: 0, archived: 0, message: "Không tìm thấy câu hỏi cần xoá." };

      const referenced = new Set(
        (
          await tx.assignmentItem.findMany({
            where: { questionId: { in: targets.map((t) => t.id) } },
            select: { questionId: true },
            distinct: ["questionId"],
          })
        ).map((r) => r.questionId)
      );
      const toArchive = targets.filter((t) => referenced.has(t.id));
      const toDelete = targets.filter((t) => !referenced.has(t.id));

      if (toDelete.length > 0) {
        await tx.question.deleteMany({ where: { id: { in: toDelete.map((t) => t.id) } } });
        if (mode === "single") {
          const deleted = toDelete[0];
          await writeAuditLog(
            {
              actor,
              action: "delete_question",
              entityType: "Question",
              entityId: deleted.id,
              detail: `Xoá câu ${deleted.code} (${typeLabel(deleted.questionTypeId)})`,
              before: {
                code: deleted.code,
                questionTypeId: deleted.questionTypeId,
                bank: deleted.bank,
                availableIn: deleted.availableIn,
              },
            },
            tx
          );
        } else {
          const codes = toDelete.map((t) => t.code);
          const shown = codes.slice(0, 20).join(", ");
          await writeAuditLog(
            {
              actor,
              action: "bulk_delete_questions",
              entityType: "QuestionType",
              entityId: questionTypeId,
              detail: `Xoá ${toDelete.length} câu (${typeLabel(questionTypeId)}): ${shown}${codes.length > 20 ? `, … (+${codes.length - 20})` : ""}`,
              before: toDelete.map((t) => ({ id: t.id, code: t.code, questionTypeId: t.questionTypeId })),
            },
            tx
          );
        }
      }

      if (toArchive.length > 0) {
        const archivedAt = new Date();
        const newlyArchived = toArchive.filter((t) => t.archivedAt === null);
        if (newlyArchived.length > 0) {
          await tx.question.updateMany({
            where: { id: { in: newlyArchived.map((t) => t.id) }, archivedAt: null },
            data: { archivedAt },
          });
          if (mode === "single") {
            const q = newlyArchived[0];
            await writeAuditLog(
              {
                actor,
                action: "archive_question",
                entityType: "Question",
                entityId: q.id,
                detail: `Ẩn câu ${q.code} (${typeLabel(q.questionTypeId)}) thay vì xoá — câu đang nằm trong bài tập`,
                before: { code: q.code, archivedAt: null },
                after: { code: q.code, archivedAt: archivedAt.toISOString() },
              },
              tx
            );
          } else {
            const codes = newlyArchived.map((t) => t.code);
            const shown = codes.slice(0, 20).join(", ");
            await writeAuditLog(
              {
                actor,
                action: "bulk_archive_questions",
                entityType: "QuestionType",
                entityId: questionTypeId,
                detail: `Ẩn ${newlyArchived.length} câu (${typeLabel(questionTypeId)}) thay vì xoá — câu đang nằm trong bài tập: ${shown}${codes.length > 20 ? `, … (+${codes.length - 20})` : ""}`,
                before: newlyArchived.map((t) => ({ id: t.id, code: t.code, archivedAt: null })),
                after: { archivedAt: archivedAt.toISOString() },
              },
              tx
            );
          }
        }
      }

      const parts: string[] = [];
      if (toDelete.length > 0) parts.push(`Đã xoá ${toDelete.length} câu.`);
      if (toArchive.length > 0) parts.push(`${toArchive.length} câu đang nằm trong bài tập nên được ẩn thay vì xoá.`);
      return { deleted: toDelete.length, archived: toArchive.length, message: parts.join(" ") };
    });
  } catch (e) {
    // Không bao giờ để lộ lỗi khoá ngoại thô ra giao diện.
    if (isForeignKeyError(e)) {
      return {
        deleted: 0,
        archived: 0,
        message: "Không xoá được: có câu vừa được thêm vào bài tập. Vui lòng tải lại trang và thử lại.",
      };
    }
    throw e;
  }
}

function formIds(formData: FormData, name: string): string[] {
  const values = formData.getAll(name).flatMap((v) => (typeof v === "string" && v.trim() ? [v.trim()] : []));
  return [...new Set(values)];
}

function formString(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Xoá 1 câu (form action). Câu đang nằm trong bài tập được ẩn thay vì xoá. */
export async function deleteQuestionAction(formData: FormData): Promise<void> {
  const admin = await requireCapability("editQuestionBank");
  const id = formString(formData, "id");
  const questionTypeId = formString(formData, "questionTypeId");
  if (id) await deleteOrArchiveQuestions(admin, [id], questionTypeId, "single");
  revalidateQuestionPages(questionTypeId);
}

/** Xoá nhiều câu (form action). Câu đang nằm trong bài tập được ẩn thay vì xoá. */
export async function bulkDeleteQuestionsAction(formData: FormData): Promise<void> {
  const admin = await requireCapability("editQuestionBank");
  const ids = formIds(formData, "ids");
  const questionTypeId = formString(formData, "questionTypeId");
  if (ids.length > 0) await deleteOrArchiveQuestions(admin, ids, questionTypeId, "bulk");
  revalidateQuestionPages(questionTypeId);
}

/** Bản dùng với useActionState của deleteQuestionAction: trả thông báo (vd. "1 câu
 * đang nằm trong bài tập nên được ẩn thay vì xoá") để hiện ngay trên giao diện. */
export async function deleteQuestionFormAction(
  _prev: QuestionDeleteState,
  formData: FormData
): Promise<QuestionDeleteState> {
  const admin = await requireCapability("editQuestionBank");
  const id = formString(formData, "id");
  const questionTypeId = formString(formData, "questionTypeId");
  if (!id) return { error: "Thiếu câu hỏi cần xoá." };
  const outcome = await deleteOrArchiveQuestions(admin, [id], questionTypeId, "single");
  revalidateQuestionPages(questionTypeId);
  return outcome.deleted + outcome.archived > 0 ? { success: outcome.message } : { error: outcome.message };
}

/** Bản dùng với useActionState của bulkDeleteQuestionsAction. */
export async function bulkDeleteQuestionsFormAction(
  _prev: QuestionDeleteState,
  formData: FormData
): Promise<QuestionDeleteState> {
  const admin = await requireCapability("editQuestionBank");
  const ids = formIds(formData, "ids");
  const questionTypeId = formString(formData, "questionTypeId");
  if (ids.length === 0) return { error: "Chưa chọn câu nào." };
  const outcome = await deleteOrArchiveQuestions(admin, ids, questionTypeId, "bulk");
  revalidateQuestionPages(questionTypeId);
  return outcome.deleted + outcome.archived > 0 ? { success: outcome.message } : { error: outcome.message };
}

/** Khôi phục 1 câu đã ẩn (archivedAt → null). Cập nhật có điều kiện + nhật ký
 * trong 1 transaction: 2 lần bấm cùng lúc chỉ ghi 1 dòng nhật ký. */
async function restoreQuestion(
  admin: { id: string; roles: Role[] },
  id: string
): Promise<{ restored: boolean; message: string }> {
  const question = await prisma.question.findUnique({
    where: { id },
    select: { id: true, code: true, questionTypeId: true, archivedAt: true },
  });
  if (!question) return { restored: false, message: "Không tìm thấy câu hỏi cần khôi phục." };
  const archivedAt = question.archivedAt;
  if (!archivedAt) {
    revalidateQuestionPages(question.questionTypeId);
    return { restored: false, message: `Câu ${question.code} đang hiển thị, không cần khôi phục.` };
  }

  const restored = await prisma.$transaction(async (tx) => {
    const { count } = await tx.question.updateMany({
      where: { id: question.id, archivedAt: { not: null } },
      data: { archivedAt: null },
    });
    if (count === 0) return false;
    await writeAuditLog(
      {
        actor: { id: admin.id, roles: admin.roles },
        action: "restore_question",
        entityType: "Question",
        entityId: question.id,
        detail: `Khôi phục câu ${question.code} (${typeLabel(question.questionTypeId)}) — hiện lại trong ngân hàng đề`,
        before: { code: question.code, archivedAt: archivedAt.toISOString() },
        after: { code: question.code, archivedAt: null },
      },
      tx
    );
    return true;
  });
  revalidateQuestionPages(question.questionTypeId);
  return restored
    ? { restored: true, message: `Đã khôi phục câu ${question.code}.` }
    : { restored: false, message: `Câu ${question.code} đã được khôi phục trước đó.` };
}

/** Khôi phục 1 câu đã ẩn (form action, nhận `id`). */
export async function restoreQuestionAction(formData: FormData): Promise<void> {
  const admin = await requireCapability("editQuestionBank");
  const id = formString(formData, "id");
  if (id) await restoreQuestion(admin, id);
}

/** Bản dùng với useActionState của restoreQuestionAction: trả thông báo để hiện
 * ngay trên giao diện. */
export async function restoreQuestionFormAction(
  _prev: QuestionDeleteState,
  formData: FormData
): Promise<QuestionDeleteState> {
  const admin = await requireCapability("editQuestionBank");
  const id = formString(formData, "id");
  if (!id) return { error: "Thiếu câu hỏi cần khôi phục." };
  const outcome = await restoreQuestion(admin, id);
  return outcome.restored ? { success: outcome.message } : { error: outcome.message };
}

export interface ImportRowError {
  row: number;
  code: string;
  error: string;
}

export interface ImportResult {
  ok: boolean;
  created: number;
  updated: number;
  errors: ImportRowError[];
}

export async function importQuestionsAction(
  _prevState: ImportResult | null,
  formData: FormData
): Promise<ImportResult> {
  const admin = await requireCapability("editQuestionBank");

  const questionTypeId = formData.get("questionTypeId") as string;
  const text = formData.get("csvContent") as string | null;
  const bankInput = formData.get("bank") as string | null;
  const schema = Object.hasOwn(QUESTION_IMPORT_SCHEMAS, questionTypeId) ? QUESTION_IMPORT_SCHEMAS[questionTypeId] : undefined;

  if (!schema) {
    return { ok: false, created: 0, updated: 0, errors: [{ row: 0, code: "-", error: "Dạng câu hỏi không hợp lệ." }] };
  }
  if (bankInput !== "PTE" && bankInput !== "TU") {
    return { ok: false, created: 0, updated: 0, errors: [{ row: 0, code: "-", error: "Ngân hàng đề không hợp lệ." }] };
  }
  const bank: QuestionBank = bankInput;
  if (!text) {
    return { ok: false, created: 0, updated: 0, errors: [{ row: 0, code: "-", error: "Vui lòng chọn 1 file CSV." }] };
  }

  const rows = parseCsv(text);
  const records = csvRowsToRecords(rows);

  if (records.length === 0) {
    return {
      ok: false,
      created: 0,
      updated: 0,
      errors: [{ row: 0, code: "-", error: "File không có dữ liệu (chỉ có dòng tiêu đề hoặc rỗng)." }],
    };
  }

  const errors: ImportRowError[] = [];
  const validRows: { code: string; availableIn: ExamPackage[]; content: Record<string, unknown> }[] = [];
  const seenCodes = new Set<string>();

  records.forEach((record, idx) => {
    const rowNum = idx + 2; // +1 header, +1 để đánh số từ 1
    const code = record.code?.trim();
    if (!code) {
      errors.push({ row: rowNum, code: "-", error: "Thiếu code (mã câu hỏi)." });
      return;
    }
    if (seenCodes.has(code)) {
      errors.push({ row: rowNum, code, error: `Code "${code}" bị trùng trong chính file này.` });
      return;
    }

    const availableInResult = parseAvailableIn(record.available_in ?? "");
    if ("error" in availableInResult) {
      errors.push({ row: rowNum, code, error: availableInResult.error });
      return;
    }

    const contentResult = schema.parseContent(record);
    if ("error" in contentResult) {
      errors.push({ row: rowNum, code, error: contentResult.error });
      return;
    }

    seenCodes.add(code);
    validRows.push({ code, availableIn: availableInResult.value, content: contentResult.content });
  });

  if (validRows.length === 0) {
    return { ok: false, created: 0, updated: 0, errors };
  }

  const existingCodes = new Set(
    (
      await prisma.question.findMany({
        where: { code: { in: validRows.map((r) => r.code) } },
        select: { code: true },
      })
    ).map((q) => q.code)
  );

  let created = 0;
  let updated = 0;

  for (const row of validRows) {
    await prisma.question.upsert({
      where: { code: row.code },
      update: {
        questionTypeId,
        skill: schema.skill,
        availableIn: row.availableIn,
        bank,
        content: row.content as Prisma.InputJsonValue,
      },
      create: {
        questionTypeId,
        skill: schema.skill,
        code: row.code,
        availableIn: row.availableIn,
        bank,
        content: row.content as Prisma.InputJsonValue,
      },
    });
    if (existingCodes.has(row.code)) updated++;
    else created++;
  }

  if (created > 0 || updated > 0) {
    await writeAuditLog({
      actor: { id: admin.id, roles: admin.roles },
      action: "import_questions",
      entityType: "QuestionType",
      entityId: questionTypeId,
      detail: `Nhập file câu hỏi ${typeLabel(questionTypeId)} vào ngân hàng ${bank === "TU" ? "Luyện đề Tủ" : "Luyện đề PTE"}: thêm mới ${created} câu, cập nhật ${updated} câu${errors.length > 0 ? `, ${errors.length} dòng lỗi` : ""}`,
      after: { bank, created, updated, errorRows: errors.length },
    });
  }

  revalidateQuestionPages(questionTypeId);

  return { ok: errors.length === 0, created, updated, errors };
}
