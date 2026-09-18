"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { QUESTION_TYPES, type ExamPackage } from "@/lib/question-types";
import { QUESTION_IMPORT_SCHEMAS, parseAvailableIn } from "@/lib/question-import/schemas";
import { parseCsv, csvRowsToRecords } from "@/lib/question-import/csv";

export async function getQuestionCounts() {
  await requireAdmin();
  const counts = await prisma.question.groupBy({
    by: ["questionTypeId"],
    _count: { questionTypeId: true },
  });
  const map = new Map(counts.map((c) => [c.questionTypeId, c._count.questionTypeId]));
  return QUESTION_TYPES.map((t) => ({
    questionTypeId: t.id,
    skill: t.skill,
    name: t.name,
    count: map.get(t.id) ?? 0,
  }));
}

export async function getQuestionsForTypeAdmin(questionTypeId: string) {
  await requireAdmin();
  return prisma.question.findMany({
    where: { questionTypeId },
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, availableIn: true, createdAt: true },
  });
}

export async function deleteQuestionAction(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  const questionTypeId = formData.get("questionTypeId") as string;
  await prisma.question.delete({ where: { id } });
  revalidatePath(`/admin/questions?type=${questionTypeId}`);
}

export async function bulkDeleteQuestionsAction(formData: FormData) {
  await requireAdmin();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const questionTypeId = formData.get("questionTypeId") as string;
  if (ids.length > 0) {
    await prisma.question.deleteMany({ where: { id: { in: ids } } });
  }
  revalidatePath(`/admin/questions?type=${questionTypeId}`);
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
  await requireAdmin();

  const questionTypeId = formData.get("questionTypeId") as string;
  const text = formData.get("csvContent") as string | null;
  const schema = QUESTION_IMPORT_SCHEMAS[questionTypeId];

  if (!schema) {
    return { ok: false, created: 0, updated: 0, errors: [{ row: 0, code: "-", error: "Dạng câu hỏi không hợp lệ." }] };
  }
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
        content: row.content as Prisma.InputJsonValue,
      },
      create: {
        questionTypeId,
        skill: schema.skill,
        code: row.code,
        availableIn: row.availableIn,
        content: row.content as Prisma.InputJsonValue,
      },
    });
    if (existingCodes.has(row.code)) updated++;
    else created++;
  }

  revalidatePath(`/admin/questions?type=${questionTypeId}`);

  return { ok: errors.length === 0, created, updated, errors };
}
