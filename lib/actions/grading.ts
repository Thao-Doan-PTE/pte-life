"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getScopedClassIdsFor, requireCapability } from "@/lib/admin/permissions";
import { writeAuditLog } from "@/lib/admin/audit";
import { getActiveRubric, type RubricCriterion } from "@/lib/admin/rubrics";
import {
  findQuestionType,
  getNextPendingAttemptId,
  isRubricEligibleType,
  parseEntityId,
  parseGradeCriteria,
  type GradingFilters,
} from "@/lib/admin/grading-queries";

/** Server action Chấm bài (HANDOFF §4.6) và sửa rubric. Mọi hàm export ở đây là
 * endpoint HTTP công khai → tự kiểm tra quyền + phạm vi lớp và kiểm tra lại toàn
 * bộ dữ liệu gửi lên (không tin id/điểm/điểm tối đa từ trình duyệt).
 * Điểm giáo viên lưu riêng ở AttemptGrade — KHÔNG ghi đè PracticeAttempt.scorePct /
 * pteScore (điểm AI dùng cho biểu đồ & Mock test, quyết định 12A). */

export type GradeFormState = {
  ok: boolean;
  message?: string;
  error?: string;
  /** Lỗi theo từng ô: score_<key> hoặc comment. */
  fieldErrors?: Record<string, string>;
  /** Bài chờ chấm kế tiếp để giao diện tự chuyển sang; null = đã hết hàng chờ. */
  nextAttemptId?: string | null;
} | null;

export type RubricFormState = { ok: boolean; message?: string; error?: string } | null;

const COMMENT_MAX = 2000;
const SCORE_RANGE_ERROR = "Nhập đủ điểm từng tiêu chí, trong khoảng cho phép.";

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function revalidateGrading() {
  revalidatePath("/admin/grading");
  // Badge "Chấm bài" trên menu + KPI Tổng quan nằm ở layout/trang /admin.
  revalidatePath("/admin", "layout");
}

export async function saveGradeAction(_prev: GradeFormState, formData: FormData): Promise<GradeFormState> {
  const user = await requireCapability("gradeSubmissions");
  // Phạm vi theo quyền chấm bài, không theo quyền xem lớp: OPS + TEACHER chỉ chấm lớp mình.
  const classIds = await getScopedClassIdsFor(user, "gradeSubmissions");

  const attemptId = parseEntityId(formData.get("attemptId"));
  if (!attemptId) return { ok: false, error: "Không tìm thấy bài làm." };

  const attempt = await prisma.practiceAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      questionTypeId: true,
      reviewStatus: true,
      user: { select: { name: true } },
      assignment: { select: { id: true, title: true, classId: true } },
    },
  });
  // Không phân biệt "không tồn tại" với "ngoài phạm vi" để không lộ dữ liệu lớp khác.
  if (!attempt || !attempt.assignment || (classIds && !classIds.includes(attempt.assignment.classId))) {
    return { ok: false, error: "Không tìm thấy bài làm hoặc bạn không có quyền chấm bài này." };
  }
  // Tài khoản nhiều vai trò (vd. giáo viên kiêm học viên) không được tự chấm bài mình.
  if (attempt.userId === user.id) {
    return { ok: false, error: "Không thể tự chấm bài của chính mình." };
  }
  if (attempt.reviewStatus !== "PENDING" && attempt.reviewStatus !== "GRADED") {
    return { ok: false, error: "Bài này không thuộc diện giáo viên chấm." };
  }
  const assignment = attempt.assignment;

  // Khoá lạc quan: thời điểm chấm của bản điểm mà người chấm đang nhìn thấy khi mở
  // form (rỗng = mở lúc bài chưa có điểm). Lệch với DB → người khác vừa chấm.
  const expectedRaw = field(formData, "expectedGradedAt");
  let expectedGradedAt: number | null = null;
  if (expectedRaw) {
    const t = Date.parse(expectedRaw);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(expectedRaw) || Number.isNaN(t)) {
      return { ok: false, error: "Dữ liệu gửi lên không hợp lệ. Tải lại trang rồi thử lại." };
    }
    expectedGradedAt = t;
  }

  // Rubric đọc lại ở server — không dùng điểm tối đa trình duyệt gửi lên.
  const rubric = await getActiveRubric(attempt.questionTypeId);
  if (!rubric || rubric.criteria.length === 0) {
    return { ok: false, error: "Dạng bài này chưa có rubric chấm." };
  }
  const sentVersion = field(formData, "rubricVersion");
  if (sentVersion && sentVersion !== String(rubric.version)) {
    return { ok: false, error: "Rubric của dạng bài vừa được cập nhật. Tải lại trang để chấm theo bản mới." };
  }

  const fieldErrors: Record<string, string> = {};
  const snapshot: (RubricCriterion & { score: number })[] = [];
  for (const c of rubric.criteria) {
    const raw = field(formData, `score_${c.key}`);
    const n = Number(raw);
    if (!/^\d{1,3}$/.test(raw) || !Number.isInteger(n) || n < 0 || n > c.max) {
      fieldErrors[`score_${c.key}`] = `Nhập số nguyên từ 0 đến ${c.max}.`;
      continue;
    }
    snapshot.push({ key: c.key, label: c.label, max: c.max, score: n });
  }
  const commentRaw = formData.get("comment");
  const comment = typeof commentRaw === "string" ? commentRaw.replace(/\r\n/g, "\n").trim() : "";
  if (comment.length > COMMENT_MAX) fieldErrors.comment = `Nhận xét tối đa ${COMMENT_MAX} ký tự.`;
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: snapshot.length < rubric.criteria.length ? SCORE_RANGE_ERROR : fieldErrors.comment,
      fieldErrors,
    };
  }

  const total = snapshot.reduce((s, c) => s + c.score, 0);
  const maxTotal = rubric.criteria.reduce((s, c) => s + c.max, 0);
  const after: Prisma.InputJsonValue = {
    reviewStatus: "GRADED",
    total,
    maxTotal,
    criteria: snapshot as unknown as Prisma.InputJsonValue,
    comment: comment || null,
    rubricId: rubric.id,
    rubricVersion: rubric.version,
  };
  const type = findQuestionType(attempt.questionTypeId);
  const typeLabel = type?.code ?? attempt.questionTypeId;

  try {
    await prisma.$transaction(async (tx) => {
      // Chỉ chuyển trạng thái khi bài vẫn còn trong diện chấm (tránh ghi đè nếu vừa bị đổi ở nơi khác).
      // UPDATE này cũng khoá dòng bài làm tới hết giao dịch → hai người lưu cùng lúc sẽ
      // xếp hàng, và người sau đọc được điểm người trước vừa ghi ở bước kiểm tra dưới.
      const { count } = await tx.practiceAttempt.updateMany({
        where: { id: attempt.id, reviewStatus: { in: ["PENDING", "GRADED"] } },
        data: { reviewStatus: "GRADED" },
      });
      if (count === 0) throw new Error("STALE_ATTEMPT");
      const current = await tx.attemptGrade.findUnique({
        where: { attemptId: attempt.id },
        select: { criteria: true, total: true, maxTotal: true, comment: true, rubricId: true, gradedById: true, gradedAt: true },
      });
      if ((current ? current.gradedAt.getTime() : null) !== expectedGradedAt) throw new Error("STALE_GRADE");
      const isRegrade = !!current;
      const before: Prisma.InputJsonValue = current
        ? {
            reviewStatus: attempt.reviewStatus,
            total: current.total,
            maxTotal: current.maxTotal,
            criteria: parseGradeCriteria(current.criteria) as unknown as Prisma.InputJsonValue,
            comment: current.comment,
            rubricId: current.rubricId,
            gradedById: current.gradedById,
            gradedAt: current.gradedAt.toISOString(),
          }
        : { reviewStatus: attempt.reviewStatus };
      const data = {
        rubricId: rubric.id,
        criteria: snapshot as unknown as Prisma.InputJsonValue,
        total,
        maxTotal,
        comment: comment || null,
        gradedById: user.id,
        gradedAt: new Date(),
      };
      await tx.attemptGrade.upsert({
        where: { attemptId: attempt.id },
        create: { attemptId: attempt.id, ...data },
        update: data,
      });
      await writeAuditLog(
        {
          actor: { id: user.id, roles: user.roles },
          action: "grade_attempt",
          entityType: "PracticeAttempt",
          entityId: attempt.id,
          detail: `${attempt.user.name} — ${isRegrade ? "Sửa điểm" : "Đã chấm"} ${typeLabel} (${assignment.title}): ${total}/${maxTotal}`,
          targetUserId: attempt.userId,
          before,
          after,
        },
        tx
      );
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STALE_ATTEMPT") {
      return { ok: false, error: "Bài làm vừa thay đổi trạng thái. Tải lại trang rồi thử lại." };
    }
    if (e instanceof Error && e.message === "STALE_GRADE") {
      return {
        ok: false,
        error: "Bài này vừa được người khác chấm hoặc sửa điểm. Tải lại trang để xem điểm mới nhất trước khi chấm lại.",
      };
    }
    throw e;
  }

  revalidateGrading();

  const filters: GradingFilters = {
    assignmentId: parseEntityId(formData.get("f_assignment")),
    classId: parseEntityId(formData.get("f_class")),
  };
  const nextAttemptId = await getNextPendingAttemptId(classIds, filters, attempt.id, user.id);
  return {
    ok: true,
    nextAttemptId,
    message: nextAttemptId
      ? `Đã lưu điểm ${total}/${maxTotal} và trả bài.`
      : `Đã lưu điểm ${total}/${maxTotal} và trả bài. Đã chấm hết bài trong hàng chờ.`,
  };
}

// ===== Rubric =====

const RUBRIC_MAX_CRITERIA = 20;
const RUBRIC_LABEL_MAX = 80;
const RUBRIC_NOTE_MAX = 300;
const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,39}$/;

/** "Oral fluency" → "oralFluency"; "Ngữ pháp" → "nguPhap". */
function slugKey(label: string): string {
  const words = label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, (ch) => (ch === "đ" ? "d" : "D"))
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const camel = words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join("")
    .slice(0, 32);
  if (!camel) return "criterion";
  return /^[A-Za-z]/.test(camel) ? camel : `c${camel}`.slice(0, 32);
}

function sameCriteria(a: RubricCriterion[], b: RubricCriterion[]): boolean {
  return a.length === b.length && a.every((c, i) => c.key === b[i].key && c.label === b[i].label && c.max === b[i].max);
}

export async function saveRubricAction(_prev: RubricFormState, formData: FormData): Promise<RubricFormState> {
  const user = await requireCapability("editRubrics");

  const questionTypeId = field(formData, "questionTypeId");
  if (!isRubricEligibleType(questionTypeId)) return { ok: false, error: "Dạng bài không hợp lệ." };

  const keys = formData.getAll("c_key").map((v) => (typeof v === "string" ? v.trim() : ""));
  const labels = formData.getAll("c_label").map((v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : ""));
  const maxes = formData.getAll("c_max").map((v) => (typeof v === "string" ? v.trim() : ""));
  if (labels.length === 0) return { ok: false, error: "Cần ít nhất 1 tiêu chí." };
  if (labels.length > RUBRIC_MAX_CRITERIA) return { ok: false, error: `Tối đa ${RUBRIC_MAX_CRITERIA} tiêu chí.` };
  if (keys.length !== labels.length || maxes.length !== labels.length) return { ok: false, error: "Dữ liệu tiêu chí không hợp lệ." };

  const criteria: RubricCriterion[] = [];
  const used = new Set<string>();
  // Tiêu chí cũ giữ nguyên mã (để gợi ý AI và bản chụp điểm khớp nhau); mã do trình duyệt gửi phải đúng mẫu.
  for (const k of keys) {
    if (!k) continue;
    if (!KEY_PATTERN.test(k)) return { ok: false, error: "Mã tiêu chí không hợp lệ." };
    if (used.has(k)) return { ok: false, error: "Mã tiêu chí bị trùng." };
    used.add(k);
  }
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (!label || label.length > RUBRIC_LABEL_MAX) {
      return { ok: false, error: `Tên tiêu chí ${i + 1} không được trống và tối đa ${RUBRIC_LABEL_MAX} ký tự.` };
    }
    const max = Number(maxes[i]);
    if (!/^\d{1,2}$/.test(maxes[i]) || !Number.isInteger(max) || max < 1 || max > 20) {
      return { ok: false, error: `Điểm tối đa của "${label}" phải là số nguyên từ 1 đến 20.` };
    }
    let key = keys[i];
    if (!key) {
      // Tiêu chí mới: mã tự tạo từ tên, thêm số nếu trùng.
      const base = slugKey(label);
      key = base;
      for (let n = 2; used.has(key); n++) key = `${base}${n}`;
      used.add(key);
    }
    criteria.push({ key, label, max });
  }

  const noteRaw = formData.get("note");
  const note = typeof noteRaw === "string" ? noteRaw.trim() : "";
  if (note.length > RUBRIC_NOTE_MAX) return { ok: false, error: `Ghi chú tối đa ${RUBRIC_NOTE_MAX} ký tự.` };

  const current = await getActiveRubric(questionTypeId);
  const baseVersion = field(formData, "baseVersion");
  if (baseVersion && current && baseVersion !== String(current.version)) {
    return { ok: false, error: "Rubric vừa được người khác cập nhật. Tải lại trang để sửa trên bản mới nhất." };
  }
  if (current?.id && sameCriteria(current.criteria, criteria) && (current.note ?? "") === note) {
    return { ok: true, message: "Không có thay đổi." };
  }

  const typeLabel = findQuestionType(questionTypeId)?.code ?? questionTypeId;
  let version = 0;
  try {
    version = await prisma.$transaction(async (tx) => {
      const agg = await tx.gradingRubric.aggregate({ where: { questionTypeId }, _max: { version: true } });
      const nextVersion = (agg._max.version ?? 0) + 1;
      await tx.gradingRubric.updateMany({ where: { questionTypeId, isActive: true }, data: { isActive: false } });
      const created = await tx.gradingRubric.create({
        data: {
          questionTypeId,
          version: nextVersion,
          criteria: criteria as unknown as Prisma.InputJsonValue,
          isActive: true,
          note: note || null,
          createdById: user.id,
        },
        select: { id: true },
      });
      await writeAuditLog(
        {
          actor: { id: user.id, roles: user.roles },
          action: "update_rubric",
          entityType: "GradingRubric",
          entityId: created.id,
          detail: `Cập nhật rubric ${typeLabel} — phiên bản ${nextVersion} (${criteria.length} tiêu chí, tổng ${criteria.reduce((s, c) => s + c.max, 0)} điểm)`,
          before: current
            ? { rubricId: current.id, version: current.version, criteria: current.criteria as unknown as Prisma.InputJsonValue, note: current.note }
            : { rubricId: null },
          after: { rubricId: created.id, version: nextVersion, criteria: criteria as unknown as Prisma.InputJsonValue, note: note || null },
        },
        tx
      );
      return nextVersion;
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { ok: false, error: "Rubric vừa được người khác cập nhật. Tải lại trang rồi thử lại." };
    }
    throw e;
  }

  revalidatePath("/admin/grading/rubrics");
  revalidatePath("/admin/grading");
  return { ok: true, message: `Đã lưu rubric ${typeLabel} — phiên bản ${version}.` };
}
