"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { AssignmentKind, AssignmentStatus, ClassStatus, ExamPackage, QuestionBank, Role } from "@/lib/generated/prisma/enums";
import { getScopedClassIdsFor, requireCapability } from "@/lib/admin/permissions";
import { assignmentRecipientEnrollmentWhere } from "@/lib/admin/assignment-queries";
import { writeAuditLog } from "@/lib/admin/audit";
import { PACKAGE_LABEL, formatVnDate } from "@/lib/admin/student-status";
import { QUESTION_TYPES } from "@/lib/question-types";
import { questionExcerpt } from "@/lib/question-excerpt";
import {
  ASSIGNABLE_CLASS_STATUSES,
  ASSIGNMENT_KINDS,
  ASSIGNMENT_STATUSES,
  compareTypeOrder,
  DUE_MAX_DAYS,
  endOfVnDay,
  isClassAssignable,
  KIND_META,
  maxDueVnIsoDate,
  normalizeNewlines,
  NOTE_MAX,
  PICKER_LIMIT_PER_TYPE,
  QUANTITY_MAX,
  QUANTITY_MIN,
  STATUS_META,
  TITLE_MAX,
  todayVnIsoDate,
  typeCodeOf,
} from "@/components/admin/assignments/assignment-meta";

/** Server action cho màn Giao bài tập (HANDOFF §4.5). Mỗi hàm export ở đây là
 * 1 endpoint HTTP công khai → tự kiểm tra quyền + phạm vi lớp và kiểm tra lại
 * toàn bộ dữ liệu gửi lên, không tin id/số liệu từ trình duyệt. */

export type CreateAssignmentField =
  | "title"
  | "classId"
  | "kind"
  | "questionTypeIds"
  | "quantity"
  | "questionIds"
  | "dueAt"
  | "note";

export type CreateAssignmentState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<CreateAssignmentField, string>>;
  assignmentId?: string;
  /** Thông báo thành công (kèm số câu thực tế đã giao). */
  message?: string;
} | null;

const MAX_ID_LENGTH = 64;
const TYPE_BY_ID = new Map(QUESTION_TYPES.map((t) => [t.id, t]));

function str(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Danh sách giá trị (checkbox nhiều lựa chọn), bỏ trùng, bỏ rỗng. */
function strList(formData: FormData, name: string): string[] {
  const out = new Set<string>();
  for (const v of formData.getAll(name)) {
    if (typeof v === "string" && v.trim()) out.add(v.trim());
  }
  return [...out];
}

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lớp người dùng được giao bài: trong phạm vi quyền giao bài (chỉ Admin / Trưởng
 * học thuật giao mọi lớp; giáo viên — kể cả kiêm vận hành — chỉ lớp mình) và còn mở. */
async function loadAssignableClass(
  user: { id: string; roles: Role[] },
  classId: string
): Promise<{ ok: true; cls: { id: string; code: string; name: string; examType: ExamPackage } } | { ok: false; error: string }> {
  if (!classId || classId.length > MAX_ID_LENGTH) return { ok: false, error: "Chọn lớp cần giao bài." };
  const scope = await getScopedClassIdsFor(user, "manageAssignments");
  if (scope && !scope.includes(classId)) {
    return { ok: false, error: "Bạn chỉ giao bài được cho lớp mình phụ trách." };
  }
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, code: true, name: true, examType: true, status: true },
  });
  if (!cls) return { ok: false, error: "Không tìm thấy lớp." };
  if (!isClassAssignable(cls.status)) {
    return { ok: false, error: "Lớp đã kết thúc hoặc đã lưu trữ — không giao bài được." };
  }
  return { ok: true, cls };
}

/** Bỏ id lạ, sắp theo thứ tự đề thi; trả lỗi nếu có dạng không áp dụng cho gói của lớp. */
function validateTypeIds(typeIds: string[], pkg: ExamPackage): { ok: true; ids: string[] } | { ok: false; error: string } {
  const invalid: string[] = [];
  for (const id of typeIds) {
    const t = TYPE_BY_ID.get(id);
    if (!t || !t.availableIn.includes(pkg)) invalid.push(t?.code ?? id.slice(0, 40));
  }
  if (invalid.length > 0) {
    return {
      ok: false,
      error: `Dạng bài không áp dụng cho ${PACKAGE_LABEL[pkg] ?? pkg}: ${invalid.join(", ")}.`,
    };
  }
  return { ok: true, ids: [...typeIds].sort(compareTypeOrder) };
}

/** Chọn ngẫu nhiên `quantity` câu, chia đều nhất có thể giữa các dạng (xoay vòng),
 * ngẫu nhiên trong từng dạng; ưu tiên ngân hàng `preferBank` trước rồi mới lấy
 * ngân hàng còn lại. Kết quả xếp theo dạng bài (thứ tự đề thi). */
function pickQuestions(
  candidates: { id: string; questionTypeId: string; bank: QuestionBank }[],
  typeIds: string[],
  quantity: number,
  preferBank: QuestionBank
): string[] {
  const queues = typeIds.map((typeId) => {
    const ofType = candidates.filter((c) => c.questionTypeId === typeId);
    return [
      ...shuffle(ofType.filter((c) => c.bank === preferBank)),
      ...shuffle(ofType.filter((c) => c.bank !== preferBank)),
    ].map((c) => c.id);
  });
  const picked: string[][] = typeIds.map(() => []);
  let total = 0;
  let progressed = true;
  while (total < quantity && progressed) {
    progressed = false;
    for (let i = 0; i < queues.length && total < quantity; i++) {
      const next = queues[i].shift();
      if (next) {
        picked[i].push(next);
        total++;
        progressed = true;
      }
    }
  }
  return picked.flat();
}

function revalidateAssignmentPages(assignmentId?: string, classId?: string) {
  revalidatePath("/admin/assignments");
  if (assignmentId) revalidatePath(`/admin/assignments/${assignmentId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/classes");
  if (classId) revalidatePath(`/admin/classes/${classId}`);
  revalidatePath("/admin/grading");
}

/** Giao bài mới cho 1 lớp (form "Giao bài mới", dùng với useActionState). */
export async function createAssignmentAction(
  _prev: CreateAssignmentState,
  formData: FormData
): Promise<CreateAssignmentState> {
  const user = await requireCapability("manageAssignments").catch(() => null);
  if (!user) return { ok: false, error: "Bạn không có quyền giao bài tập (hoặc phiên đăng nhập đã hết hạn)." };

  // ---- Đọc & kiểm tra dữ liệu nhập ----
  const fieldErrors: Partial<Record<CreateAssignmentField, string>> = {};

  const title = str(formData, "title").replace(/\s+/g, " ");
  if (!title) fieldErrors.title = "Nhập tên bài tập.";
  else if (title.length > TITLE_MAX) fieldErrors.title = `Tên bài tập tối đa ${TITLE_MAX} ký tự.`;

  const classId = str(formData, "classId");
  if (!classId) fieldErrors.classId = "Chọn lớp cần giao bài.";

  const kindRaw = str(formData, "kind");
  const kind = ASSIGNMENT_KINDS.find((k) => k === kindRaw) as AssignmentKind | undefined;
  if (!kind) fieldErrors.kind = "Chọn hình thức bài tập.";

  const typeIdsRaw = strList(formData, "questionTypeIds");
  if (typeIdsRaw.length === 0) fieldErrors.questionTypeIds = "Chọn ít nhất 1 dạng bài.";
  else if (typeIdsRaw.length > QUESTION_TYPES.length) fieldErrors.questionTypeIds = "Danh sách dạng bài không hợp lệ.";

  const manual = str(formData, "pickMode") === "manual";
  const handPicked = strList(formData, "questionIds");
  let quantity = 0;
  if (manual || handPicked.length > 0) {
    if (handPicked.length === 0) fieldErrors.questionIds = "Chọn ít nhất 1 câu hỏi.";
    else if (handPicked.length > QUANTITY_MAX) fieldErrors.questionIds = `Tối đa ${QUANTITY_MAX} câu mỗi bài tập.`;
    else if (handPicked.some((id) => id.length > MAX_ID_LENGTH)) fieldErrors.questionIds = "Danh sách câu hỏi không hợp lệ.";
  } else {
    const q = str(formData, "quantity");
    quantity = /^\d{1,4}$/.test(q) ? Number(q) : NaN;
    if (!Number.isInteger(quantity) || quantity < QUANTITY_MIN || quantity > QUANTITY_MAX) {
      fieldErrors.quantity = `Số câu phải là số nguyên từ ${QUANTITY_MIN} đến ${QUANTITY_MAX}.`;
    }
  }

  const dueRaw = str(formData, "dueAt");
  let dueAt: Date | null = null;
  if (dueRaw) {
    dueAt = endOfVnDay(dueRaw);
    if (!dueAt) fieldErrors.dueAt = "Hạn nộp không hợp lệ.";
    else if (dueRaw < todayVnIsoDate()) fieldErrors.dueAt = "Hạn nộp không được là ngày đã qua.";
    else if (dueRaw > maxDueVnIsoDate()) fieldErrors.dueAt = `Hạn nộp tối đa ${DUE_MAX_DAYS} ngày kể từ hôm nay.`;
  }

  const notifyRaw = str(formData, "notify");
  const notify = notifyRaw === "on" || notifyRaw === "true" || notifyRaw === "1";

  // FormData multipart đổi mỗi xuống dòng thành CRLF → chuẩn hoá trước khi đếm/lưu.
  const note = normalizeNewlines(str(formData, "note"));
  if (note.length > NOTE_MAX) fieldErrors.note = `Ghi chú tối đa ${NOTE_MAX} ký tự.`;

  const invalid = (extra?: Partial<Record<CreateAssignmentField, string>>): CreateAssignmentState => ({
    ok: false,
    error: "Chưa giao được bài — kiểm tra lại các ô được đánh dấu.",
    fieldErrors: { ...fieldErrors, ...extra },
  });
  if (Object.keys(fieldErrors).length > 0 || !kind) return invalid();

  // ---- Lớp: trong phạm vi + còn mở ----
  const clsResult = await loadAssignableClass(user, classId);
  if (!clsResult.ok) return invalid({ classId: clsResult.error });
  const cls = clsResult.cls;

  const typesResult = validateTypeIds(typeIdsRaw, cls.examType);
  if (!typesResult.ok) return invalid({ questionTypeIds: typesResult.error });
  const typeIds = typesResult.ids;

  // ---- Học viên phải nộp = học viên đang học của lớp lúc giao: ghi danh ACTIVE,
  // tài khoản chưa bị khoá và còn role STUDENT (người không đăng nhập được thì
  // không nộp được — không tính vào mẫu số tỷ lệ nộp). Cùng điều kiện với số
  // "học viên đang học" xem trước trên form. ----
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classId: cls.id, ...assignmentRecipientEnrollmentWhere },
    select: { studentId: true },
  });
  if (enrollments.length === 0) return invalid({ classId: "Lớp chưa có học viên đang học." });
  const studentIds = enrollments.map((e) => e.studentId);

  // ---- Chọn câu hỏi ----
  const questionWhere = { archivedAt: null, questionTypeId: { in: typeIds }, availableIn: { has: cls.examType } };
  let questionIds: string[];
  /** Dạng bài lưu vào bài tập — chỉ giữ các dạng thực sự có câu trong bài (cả 2 cách chọn). */
  let assignmentTypeIds = typeIds;
  if (handPicked.length > 0) {
    const found = await prisma.question.findMany({
      where: { ...questionWhere, id: { in: handPicked } },
      select: { id: true, questionTypeId: true },
    });
    if (found.length !== handPicked.length) {
      const bad = handPicked.length - found.length;
      return invalid({
        questionIds: `${bad} câu đã chọn không còn hợp lệ (đã lưu trữ hoặc không thuộc dạng bài / gói của lớp). Tải lại danh sách câu.`,
      });
    }
    questionIds = handPicked;
    const usedTypes = new Set(found.map((q) => q.questionTypeId));
    assignmentTypeIds = typeIds.filter((t) => usedTypes.has(t));
  } else {
    const candidates = await prisma.question.findMany({
      where: questionWhere,
      select: { id: true, questionTypeId: true, bank: true },
    });
    questionIds = pickQuestions(candidates, typeIds, quantity, kind === "TU" ? "TU" : "PTE");
    if (questionIds.length === 0) {
      return invalid({
        questionTypeIds: `Ngân hàng đề chưa có câu nào cho các dạng đã chọn (${PACKAGE_LABEL[cls.examType] ?? cls.examType}).`,
      });
    }
    // Dạng không có câu nào trong bài (ngân hàng trống, hoặc số câu ít hơn số dạng) → không lưu.
    const typeOfQuestion = new Map(candidates.map((c) => [c.id, c.questionTypeId]));
    const usedTypes = new Set(questionIds.map((id) => typeOfQuestion.get(id)));
    assignmentTypeIds = typeIds.filter((t) => usedTypes.has(t));
  }
  const droppedTypeIds = typeIds.filter((t) => !assignmentTypeIds.includes(t));

  // ---- Lưu: bài tập + câu hỏi + học viên phải nộp + nhật ký trong 1 transaction ----
  let created: { id: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      // Kiểm tra lại trạng thái lớp khi giữ khoá dòng lớp (FOR SHARE chờ thao tác kết
      // thúc / lưu trữ lớp đang chạy): lớp vừa đóng sau bước kiểm tra ở trên thì không
      // tạo bài OPEN cho lớp đã đóng.
      const locked = await tx.$queryRaw<{ status: ClassStatus }[]>`
        SELECT "status"::text AS "status" FROM "Class" WHERE "id" = ${cls.id} FOR SHARE`;
      if (!locked[0] || !isClassAssignable(locked[0].status)) throw new Error("CLASS_NOT_ASSIGNABLE");
      const assignment = await tx.assignment.create({
        data: {
          classId: cls.id,
          title,
          kind,
          questionTypeIds: assignmentTypeIds,
          note: note || null,
          dueAt,
          notify,
          createdById: user.id,
          items: { createMany: { data: questionIds.map((questionId, position) => ({ questionId, position })) } },
          recipients: { createMany: { data: studentIds.map((studentId) => ({ studentId })) } },
        },
        select: { id: true },
      });
      await writeAuditLog(
        {
          actor: { id: user.id, roles: user.roles },
          action: "create_assignment",
          entityType: "Assignment",
          entityId: assignment.id,
          detail:
            `Giao bài "${title}" (${KIND_META[kind].label}) cho lớp ${cls.code} — ` +
            `${questionIds.length} câu, ${studentIds.length} học viên` +
            (dueAt ? `, hạn ${formatVnDate(dueAt)}` : ""),
          after: {
            title,
            classId: cls.id,
            classCode: cls.code,
            kind,
            questionTypeIds: assignmentTypeIds,
            pickMode: handPicked.length > 0 ? "manual" : "random",
            requestedQuantity: handPicked.length > 0 ? handPicked.length : quantity,
            questionCount: questionIds.length,
            questionIds,
            recipientCount: studentIds.length,
            dueAt: dueAt ? dueAt.toISOString() : null,
            notify,
            note: note || null,
          },
        },
        tx
      );
      return assignment;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "CLASS_NOT_ASSIGNABLE") {
      return invalid({ classId: "Lớp đã kết thúc hoặc đã lưu trữ — không giao bài được." });
    }
    // Hiếm: câu hỏi vừa bị xoá / lớp vừa đổi trong lúc giao → báo lỗi trên form thay vì trang lỗi.
    console.error("createAssignmentAction failed", e);
    return { ok: false, error: "Không lưu được bài tập (dữ liệu vừa thay đổi). Tải lại trang và thử lại." };
  }

  revalidateAssignmentPages(created.id, cls.id);

  const typeCodes = assignmentTypeIds.map(typeCodeOf).join(", ");
  const shortfall =
    handPicked.length === 0 && questionIds.length < quantity
      ? ` Ngân hàng đề chỉ có ${questionIds.length}/${quantity} câu phù hợp nên bài gồm ${questionIds.length} câu.`
      : "";
  const dropped =
    droppedTypeIds.length > 0
      ? ` Không có câu nào thuộc dạng ${droppedTypeIds.map(typeCodeOf).join(", ")}` +
        (handPicked.length === 0 && quantity < typeIds.length
          ? ` (số câu ít hơn số dạng đã chọn).`
          : ".")
      : "";
  return {
    ok: true,
    assignmentId: created.id,
    message: `Đã giao “${title}” cho lớp ${cls.code}: ${questionIds.length} câu (${typeCodes}), ${studentIds.length} học viên phải nộp.${shortfall}${dropped}`,
  };
}

/** Đóng / mở lại / lưu trữ 1 bài tập. Bài đóng hoặc lưu trữ không nhận bài nộp mới. */
export async function setAssignmentStatusAction(formData: FormData): Promise<void> {
  const user = await requireCapability("manageAssignments");
  const assignmentId = str(formData, "assignmentId");
  const statusRaw = str(formData, "status");
  const status = ASSIGNMENT_STATUSES.find((s) => s === statusRaw) as AssignmentStatus | undefined;
  if (!assignmentId || assignmentId.length > MAX_ID_LENGTH || !status) {
    throw new Error("Dữ liệu không hợp lệ.");
  }

  const [assignment, scope] = await Promise.all([
    prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, title: true, status: true, classId: true, class: { select: { code: true, status: true } } },
    }),
    getScopedClassIdsFor(user, "manageAssignments"),
  ]);
  // Giáo viên (kể cả kiêm vận hành) chỉ thao tác bài tập của lớp mình — bài lớp khác coi như không tồn tại.
  if (!assignment || (scope && !scope.includes(assignment.classId))) {
    throw new Error("Không tìm thấy bài tập.");
  }
  if (assignment.status === status) return;
  // Bỏ lưu trữ luôn về "Đã đóng"; muốn nhận bài lại thì mở lại ở bước sau.
  if (assignment.status === "ARCHIVED" && status !== "CLOSED") {
    throw new Error("Bài lưu trữ chỉ khôi phục được về trạng thái Đã đóng.");
  }
  // Mở lại → bài nộp mới lại vào hàng chờ chấm, nên lớp phải còn đang học / sắp khai giảng.
  // Lớp vừa kết thúc sau khi trang được tải: không đổi gì, chỉ tải lại trang để ẩn nút "Mở lại".
  if (status === "OPEN" && !isClassAssignable(assignment.class.status)) {
    revalidateAssignmentPages(assignment.id, assignment.classId);
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (status === "OPEN") {
      // Khoá dòng lớp (FOR SHARE) để không mở lại đúng lúc lớp đang bị kết thúc/lưu trữ.
      await tx.$executeRaw`SELECT 1 FROM "Class" WHERE "id" = ${assignment.classId} FOR SHARE`;
    }
    // Chỉ đổi nếu trạng thái chưa bị người khác đổi trong lúc này (tránh ghi log trùng).
    const { count } = await tx.assignment.updateMany({
      // Mở lại: kiểm tra lại trạng thái lớp ngay trong lệnh cập nhật (lớp có thể vừa bị đóng).
      where: {
        id: assignment.id,
        status: assignment.status,
        ...(status === "OPEN" ? { class: { status: { in: ASSIGNABLE_CLASS_STATUSES } } } : {}),
      },
      data: { status },
    });
    if (count === 0) return;
    await writeAuditLog(
      {
        actor: { id: user.id, roles: user.roles },
        action: "update_assignment_status",
        entityType: "Assignment",
        entityId: assignment.id,
        detail: `Đổi trạng thái bài "${assignment.title}" (lớp ${assignment.class.code}): ${STATUS_META[assignment.status].label} → ${STATUS_META[status].label}`,
        before: { status: assignment.status },
        after: { status },
      },
      tx
    );
  });

  revalidateAssignmentPages(assignment.id, assignment.classId);
}

export interface AssignableQuestion {
  id: string;
  code: string;
  questionTypeId: string;
  typeCode: string;
  isTu: boolean;
  excerpt: string;
}

export type AssignableQuestionsResult =
  | { ok: true; questions: AssignableQuestion[]; totals: Record<string, number>; limitPerType: number }
  | { ok: false; error: string };

/** Danh sách câu để chọn tay trong form giao bài: câu chưa lưu trữ thuộc các dạng
 * đã chọn và áp dụng cho gói của lớp. Ưu tiên câu Tủ trước khi hình thức là
 * Luyện đề Tủ. Tối đa PICKER_LIMIT_PER_TYPE câu mỗi dạng. */
export async function listAssignableQuestionsAction(
  classId: unknown,
  questionTypeIds: unknown,
  kind: unknown
): Promise<AssignableQuestionsResult> {
  const user = await requireCapability("manageAssignments").catch(() => null);
  if (!user) return { ok: false, error: "Bạn không có quyền xem danh sách câu (hoặc phiên đăng nhập đã hết hạn)." };
  if (
    typeof classId !== "string" ||
    !Array.isArray(questionTypeIds) ||
    questionTypeIds.length === 0 ||
    questionTypeIds.length > QUESTION_TYPES.length ||
    !questionTypeIds.every((t) => typeof t === "string")
  ) {
    return { ok: false, error: "Chọn lớp và ít nhất 1 dạng bài." };
  }
  const clsResult = await loadAssignableClass(user, classId);
  if (!clsResult.ok) return { ok: false, error: clsResult.error };
  const cls = clsResult.cls;

  const typesResult = validateTypeIds([...new Set(questionTypeIds as string[])], cls.examType);
  if (!typesResult.ok) return { ok: false, error: typesResult.error };

  const preferTu = kind === "TU";
  const perType = await Promise.all(
    typesResult.ids.map(async (typeId) => {
      const where = { archivedAt: null, questionTypeId: typeId, availableIn: { has: cls.examType } };
      const [rows, total] = await Promise.all([
        prisma.question.findMany({
          where,
          // Enum QuestionBank: PTE < TU → desc đưa câu Tủ lên trước.
          orderBy: [{ bank: preferTu ? "desc" : "asc" }, { code: "asc" }],
          take: PICKER_LIMIT_PER_TYPE,
          select: { id: true, code: true, questionTypeId: true, bank: true, content: true },
        }),
        prisma.question.count({ where }),
      ]);
      return { typeId, rows, total };
    })
  );

  const questions: AssignableQuestion[] = perType.flatMap(({ rows }) =>
    rows.map((q) => ({
      id: q.id,
      code: q.code,
      questionTypeId: q.questionTypeId,
      typeCode: typeCodeOf(q.questionTypeId),
      isTu: q.bank === "TU",
      excerpt:
        typeof q.content === "object" && q.content !== null && !Array.isArray(q.content)
          ? questionExcerpt(q.content as Record<string, unknown>)
          : "(không có nội dung xem trước)",
    }))
  );
  const totals = Object.fromEntries(perType.map((p) => [p.typeId, p.total]));
  return { ok: true, questions, totals, limitPerType: PICKER_LIMIT_PER_TYPE };
}
