"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/admin/audit";
import { getScopedClassIds, requireCapability } from "@/lib/admin/permissions";
import type { ClassStatus, ClassTeacherRole, Role } from "@/lib/generated/prisma/enums";
import { STATUS_META as ASSIGNMENT_STATUS_META } from "@/components/admin/assignments/assignment-meta";

/** Kết quả trả về cho form dùng useActionState (hiện lỗi/thành công ngay trên form
 * thay vì ném lỗi ra trang lỗi). */
export type ClassFormState = { error?: string; success?: string } | null;

/** Lỗi nghiệp vụ có thông báo hiển thị được cho người dùng. */
class ClassActionError extends Error {}

type Actor = { id: string; roles: Role[] };

const CLASS_STATUSES: ClassStatus[] = ["UPCOMING", "ACTIVE", "FINISHED", "ARCHIVED"];

const STATUS_LABEL: Record<ClassStatus, string> = {
  UPCOMING: "Sắp khai giảng",
  ACTIVE: "Đang học",
  FINISHED: "Đã kết thúc",
  ARCHIVED: "Lưu trữ",
};

/** Giới hạn số buổi của 1 khoá (nhập tay ở trang chi tiết lớp). */
const MAX_SESSIONS = 500;

/** Giờ Việt Nam = UTC+7 (không đổi giờ theo mùa). */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function actorOf(user: Actor): Actor {
  return { id: user.id, roles: user.roles };
}

/** Lớp đổi (sĩ số, giáo viên, số buổi…) → làm mới các trang hiển thị số liệu lớp:
 * danh sách lớp, chi tiết từng lớp bị ảnh hưởng, Tổng quan, Học viên, Giáo viên. */
function revalidateClassPages(...classIds: string[]) {
  revalidatePath("/admin/classes");
  for (const id of new Set(classIds)) {
    if (id) revalidatePath(`/admin/classes/${id}`);
  }
  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
}

/** A3 — Lớp học: ADMIN/OPS/ACADEMIC_LEAD thấy mọi lớp, TEACHER chỉ thấy lớp
 * mình được phân công (mục 2.2 spec: TEACHER truy cập lớp không thuộc mình → 403).
 * Giới hạn theo lớp nằm ngay trong câu truy vấn (getScopedClassIds). */
export async function getClassesForCurrentUser() {
  const user = await requireCapability("viewClasses");
  const scopedIds = await getScopedClassIds(user);

  return prisma.class.findMany({
    where: scopedIds ? { id: { in: scopedIds } } : {},
    orderBy: { createdAt: "desc" },
    include: {
      teachers: { include: { teacher: { select: { id: true, name: true, email: true } } } },
      // Sĩ số = học viên còn đang học (ACTIVE), không tính người đã rời lớp.
      _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
    },
  });
}

export async function getClassDetail(classId: string) {
  const user = await requireCapability("viewClasses");
  const scopedIds = await getScopedClassIds(user);
  // Giáo viên chỉ được xem lớp mình được phân công — chặn trước khi đọc dữ liệu lớp.
  if (scopedIds && !scopedIds.includes(classId)) {
    throw new Error("Bạn không có quyền xem lớp này.");
  }

  return prisma.class.findUnique({
    where: { id: classId },
    include: {
      teachers: {
        include: { teacher: { select: { id: true, name: true, email: true } } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
      enrollments: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              examPackage: true,
              status: true,
              expiresAt: true,
              // Quyết định 5B: nhãn "Bảo lưu đến dd/mm/yyyy" ở cột Hạn gói.
              reservedUntil: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}

/** Phần lõi tạo lớp — dùng chung cho createClassAction (ném lỗi) và
 * createClassFormAction (trả lỗi về form). */
async function createClassCore(actor: Actor, formData: FormData) {
  const code = field(formData, "code");
  const name = field(formData, "name");
  const examType = field(formData, "examType");
  const targetScoreRaw = field(formData, "targetScore");
  const schedule = field(formData, "schedule") || null;
  const startDateRaw = field(formData, "startDate");

  if (!code || !name) throw new ClassActionError("Cần nhập mã lớp và tên lớp.");
  if (code.length > 50 || name.length > 200 || (schedule && schedule.length > 200)) {
    throw new ClassActionError("Mã lớp tối đa 50 ký tự; tên lớp và lịch học tối đa 200 ký tự.");
  }
  if (examType !== "academic" && examType !== "core") throw new ClassActionError("Gói thi không hợp lệ.");

  let targetScore: number | null = null;
  if (targetScoreRaw) {
    const n = Number(targetScoreRaw);
    if (!Number.isInteger(n) || n < 10 || n > 90) {
      throw new ClassActionError("Điểm mục tiêu phải là số nguyên từ 10 đến 90.");
    }
    targetScore = n;
  }

  let startDate: Date | null = null;
  if (startDateRaw) {
    // <input type="date"> gửi yyyy-mm-dd — lưu 00:00 giờ Việt Nam của ngày đó.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(startDateRaw) ? new Date(`${startDateRaw}T00:00:00+07:00`) : new Date(NaN);
    // Ngày không có thật (vd. 2026-02-31) bị Date tự "lăn" sang tháng sau — đổi
    // ngược về yyyy-mm-dd giờ VN phải ra đúng chuỗi đã nhập, nếu không thì từ chối.
    if (Number.isNaN(d.getTime()) || new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10) !== startDateRaw) {
      throw new ClassActionError("Ngày khai giảng không hợp lệ.");
    }
    startDate = d;
  }

  const existing = await prisma.class.findUnique({ where: { code }, select: { id: true } });
  if (existing) throw new ClassActionError(`Mã lớp ${code} đã tồn tại.`);

  let cls;
  try {
    cls = await prisma.$transaction(async (tx) => {
      const created = await tx.class.create({
        data: { code, name, examType, targetScore, schedule, startDate, createdById: actor.id },
      });
      await writeAuditLog(
        {
          actor,
          action: "create_class",
          entityType: "Class",
          entityId: created.id,
          detail: `Tạo lớp ${created.code} — ${created.name}`,
          after: {
            code: created.code,
            name: created.name,
            examType: created.examType,
            targetScore: created.targetScore,
            schedule: created.schedule,
            startDate: created.startDate?.toISOString() ?? null,
          },
        },
        tx
      );
      return created;
    });
  } catch (e) {
    // Hai người tạo cùng mã lớp cùng lúc → vi phạm unique.
    if ((e as { code?: string }).code === "P2002") throw new ClassActionError(`Mã lớp ${code} đã tồn tại.`);
    throw e;
  }
  revalidateClassPages();
  return cls;
}

export async function createClassAction(formData: FormData) {
  const user = await requireCapability("manageClasses");
  const cls = await createClassCore(actorOf(user), formData);
  redirect(`/admin/classes/${cls.id}`);
}

/** Bản dùng với useActionState: lỗi nhập liệu (trùng mã lớp…) hiện ngay trên form. */
export async function createClassFormAction(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const user = await requireCapability("manageClasses");
  let classId: string;
  try {
    classId = (await createClassCore(actorOf(user), formData)).id;
  } catch (e) {
    if (e instanceof ClassActionError) return { error: e.message };
    throw e;
  }
  redirect(`/admin/classes/${classId}`);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Khoá dòng lớp trong transaction (FOR NO KEY UPDATE — cùng mức khoá với một
 * lệnh UPDATE): đọc trạng thái/số buổi sau khi khoá nên giá trị "trước" ghi vào
 * nhật ký luôn đúng, và thao tác xếp lớp đang kiểm tra trạng thái lớp (FOR SHARE)
 * phải chờ thao tác này xong. Trả về false nếu lớp không còn. */
async function lockClassRow(tx: Tx, classId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Class" WHERE "id" = ${classId} FOR NO KEY UPDATE`;
  return rows.length > 0;
}

/** Lớp chuyển sang Đã kết thúc / Lưu trữ thì không nhận bài nộp mới nữa (giống điều
 * kiện "Mở lại" ở setAssignmentStatusAction) → đóng mọi bài tập đang mở của lớp NGAY
 * TRONG transaction đổi trạng thái lớp, mỗi bài 1 dòng nhật ký update_assignment_status.
 * Từng bài đổi theo kiểu so-sánh-rồi-ghi (chỉ khi vẫn đang OPEN) để không ghi log cho
 * bài vừa được người khác đóng cùng lúc. Trả về id các bài đã đóng. */
async function closeOpenAssignmentsOfClass(
  tx: Tx,
  actor: Actor,
  classId: string,
  classCode: string,
  nextClassStatus: ClassStatus
): Promise<string[]> {
  const open = await tx.assignment.findMany({
    where: { classId, status: "OPEN" },
    select: { id: true, title: true },
  });
  const closed: string[] = [];
  for (const a of open) {
    const { count } = await tx.assignment.updateMany({
      where: { id: a.id, status: "OPEN" },
      data: { status: "CLOSED" },
    });
    if (count !== 1) continue;
    await writeAuditLog(
      {
        actor,
        action: "update_assignment_status",
        entityType: "Assignment",
        entityId: a.id,
        detail:
          `Đổi trạng thái bài "${a.title}" (lớp ${classCode}): ` +
          `${ASSIGNMENT_STATUS_META.OPEN.label} → ${ASSIGNMENT_STATUS_META.CLOSED.label}` +
          ` (tự đóng do lớp chuyển sang «${STATUS_LABEL[nextClassStatus]}»)`,
        before: { status: "OPEN" },
        after: { status: "CLOSED" },
      },
      tx
    );
    closed.push(a.id);
  }
  return closed;
}

/** Trạng thái lớp không còn nhận bài nộp → đóng bài tập đang mở. */
function closesAssignments(status: ClassStatus): boolean {
  return status === "FINISHED" || status === "ARCHIVED";
}

/** Làm mới thêm các trang bài tập khi đổi trạng thái lớp có đóng bài. */
function revalidateClosedAssignments(assignmentIds: string[]) {
  if (assignmentIds.length === 0) return;
  revalidatePath("/admin/assignments");
  for (const id of assignmentIds) revalidatePath(`/admin/assignments/${id}`);
  revalidatePath("/admin/grading");
}

export async function archiveClassAction(formData: FormData) {
  const user = await requireCapability("manageClasses");
  const classId = field(formData, "classId");
  if (!classId) throw new Error("Không tìm thấy lớp.");

  const result = await prisma.$transaction(async (tx) => {
    if (!(await lockClassRow(tx, classId))) throw new Error("Không tìm thấy lớp.");
    const cls = await tx.class.findUniqueOrThrow({ where: { id: classId }, select: { code: true, status: true } });
    if (cls.status === "ARCHIVED") return null;

    await tx.class.update({ where: { id: classId }, data: { status: "ARCHIVED" } });
    await writeAuditLog(
      {
        actor: actorOf(user),
        action: "archive_class",
        entityType: "Class",
        entityId: classId,
        detail: "Lưu trữ lớp",
        before: { status: cls.status },
        after: { status: "ARCHIVED" },
      },
      tx
    );
    return { closedAssignmentIds: await closeOpenAssignmentsOfClass(tx, actorOf(user), classId, cls.code, "ARCHIVED") };
  });
  if (result) {
    revalidateClassPages(classId);
    revalidateClosedAssignments(result.closedAssignmentIds);
  }
}

/** Đổi trạng thái lớp (Sắp khai giảng → Đang học → Đã kết thúc…). */
export async function updateClassStatusAction(formData: FormData) {
  const user = await requireCapability("manageClasses");
  const classId = field(formData, "classId");
  const status = field(formData, "status") as ClassStatus;
  if (!CLASS_STATUSES.includes(status)) throw new Error("Trạng thái lớp không hợp lệ.");
  if (!classId) throw new Error("Không tìm thấy lớp.");

  const result = await prisma.$transaction(async (tx) => {
    if (!(await lockClassRow(tx, classId))) throw new Error("Không tìm thấy lớp.");
    const cls = await tx.class.findUniqueOrThrow({ where: { id: classId }, select: { code: true, status: true } });
    if (cls.status === status) return null;

    await tx.class.update({ where: { id: classId }, data: { status } });
    await writeAuditLog(
      {
        actor: actorOf(user),
        action: "update_class_status",
        entityType: "Class",
        entityId: classId,
        detail: `Đổi trạng thái lớp ${cls.code}: ${STATUS_LABEL[cls.status]} → ${STATUS_LABEL[status]}`,
        before: { status: cls.status },
        after: { status },
      },
      tx
    );
    const closedAssignmentIds = closesAssignments(status)
      ? await closeOpenAssignmentsOfClass(tx, actorOf(user), classId, cls.code, status)
      : [];
    return { closedAssignmentIds };
  });
  if (result) {
    revalidateClassPages(classId);
    revalidateClosedAssignments(result.closedAssignmentIds);
  }
}

/** Số nguyên không âm viết bằng chữ số (không nhận 1.5, 1e2, -3, " "). */
function parseWholeNumber(raw: string): number | null {
  if (!/^\d{1,6}$/.test(raw)) return null;
  return Number(raw);
}

/** Cập nhật số buổi đã học / tổng số buổi của lớp (vận hành nhập tay).
 * sessionsTotal: để trống = chưa nhập, hoặc số nguyên 1–500.
 * sessionsDone: số nguyên 0..sessionsTotal (0..500 khi chưa nhập tổng). */
export async function updateClassSessionsAction(formData: FormData): Promise<ClassFormState> {
  const user = await requireCapability("manageClasses");
  const classId = field(formData, "classId");
  const totalRaw = field(formData, "sessionsTotal");
  const doneRaw = field(formData, "sessionsDone");

  let sessionsTotal: number | null = null;
  if (totalRaw) {
    sessionsTotal = parseWholeNumber(totalRaw);
    if (sessionsTotal === null || sessionsTotal < 1 || sessionsTotal > MAX_SESSIONS) {
      return { error: `Tổng số buổi phải là số nguyên từ 1 đến ${MAX_SESSIONS} (hoặc để trống).` };
    }
  }
  const sessionsDone = parseWholeNumber(doneRaw);
  const doneMax = sessionsTotal ?? MAX_SESSIONS;
  if (sessionsDone === null || sessionsDone > doneMax) {
    return {
      error:
        sessionsTotal !== null
          ? `Số buổi đã học phải là số nguyên từ 0 đến ${sessionsTotal} (tổng số buổi).`
          : `Số buổi đã học phải là số nguyên từ 0 đến ${MAX_SESSIONS}.`,
    };
  }

  if (!classId) return { error: "Không tìm thấy lớp." };

  const fmt = (done: number, total: number | null) => `${done}/${total ?? "—"}`;
  const outcome = await prisma.$transaction(async (tx) => {
    if (!(await lockClassRow(tx, classId))) return "not_found" as const;
    const cls = await tx.class.findUniqueOrThrow({
      where: { id: classId },
      select: { code: true, sessionsDone: true, sessionsTotal: true },
    });
    if (cls.sessionsDone === sessionsDone && cls.sessionsTotal === sessionsTotal) return "unchanged" as const;

    await tx.class.update({ where: { id: classId }, data: { sessionsDone, sessionsTotal } });
    await writeAuditLog(
      {
        actor: actorOf(user),
        action: "update_class_sessions",
        entityType: "Class",
        entityId: classId,
        detail: `Cập nhật số buổi lớp ${cls.code}: ${fmt(cls.sessionsDone, cls.sessionsTotal)} → ${fmt(sessionsDone, sessionsTotal)}`,
        before: { sessionsDone: cls.sessionsDone, sessionsTotal: cls.sessionsTotal },
        after: { sessionsDone, sessionsTotal },
      },
      tx
    );
    return "saved" as const;
  });
  if (outcome === "not_found") return { error: "Không tìm thấy lớp." };
  if (outcome === "unchanged") return { success: "Không có thay đổi." };
  revalidateClassPages(classId);
  return { success: `Đã lưu: ${fmt(sessionsDone, sessionsTotal)} buổi.` };
}

export async function assignTeacherAction(formData: FormData) {
  const user = await requireCapability("manageClasses");
  const classId = field(formData, "classId");
  const teacherId = field(formData, "teacherId");
  // Trường "role" không bắt buộc — mặc định Giáo viên chính như trước.
  const role: ClassTeacherRole = field(formData, "role") === "ASSISTANT" ? "ASSISTANT" : "MAIN";

  const [teacher, cls] = await Promise.all([
    prisma.user.findUnique({ where: { id: teacherId } }),
    prisma.class.findUnique({ where: { id: classId }, select: { id: true } }),
  ]);
  if (!teacher || !teacher.roles.includes("TEACHER")) {
    throw new Error("User này không có role TEACHER.");
  }
  if (!cls) throw new Error("Không tìm thấy lớp.");

  await prisma.$transaction(async (tx) => {
    const previous = await tx.classTeacher.findUnique({
      where: { classId_teacherId: { classId, teacherId } },
      select: { role: true },
    });
    await tx.classTeacher.upsert({
      where: { classId_teacherId: { classId, teacherId } },
      update: { role },
      create: { classId, teacherId, role },
    });
    await writeAuditLog(
      {
        actor: actorOf(user),
        action: "assign_teacher",
        entityType: "Class",
        entityId: classId,
        targetUserId: teacherId,
        detail: `Gán giáo viên ${teacher.name} (${teacher.email})${role === "ASSISTANT" ? " — trợ giảng" : ""}`,
        before: { role: previous?.role ?? null },
        after: { role },
      },
      tx
    );
  });
  revalidateClassPages(classId);
}

export async function removeTeacherAction(formData: FormData) {
  const user = await requireCapability("manageClasses");
  const classId = field(formData, "classId");
  const teacherId = field(formData, "teacherId");

  if (!classId || !teacherId) throw new Error("Giáo viên này không còn trong lớp.");

  const changed = await prisma.$transaction(async (tx) => {
    const link = await tx.classTeacher.findUnique({
      where: { classId_teacherId: { classId, teacherId } },
      select: { role: true },
    });
    if (!link) throw new Error("Giáo viên này không còn trong lớp.");
    // Xoá có điều kiện: 2 lần bấm "Bỏ" cùng lúc chỉ ghi 1 dòng nhật ký.
    const { count } = await tx.classTeacher.deleteMany({ where: { classId, teacherId } });
    if (count !== 1) return false;
    await writeAuditLog(
      {
        actor: actorOf(user),
        action: "remove_teacher",
        entityType: "Class",
        entityId: classId,
        targetUserId: teacherId,
        detail: `Bỏ giáo viên khỏi lớp (userId: ${teacherId})`,
        before: { role: link.role },
      },
      tx
    );
    return true;
  });
  if (changed) revalidateClassPages(classId);
}

/** Phần lõi xếp học viên vào lớp. Quy tắc (HANDOFF mục 5 + quyết định 8A):
 * - chỉ xếp vào lớp cùng gói học; không xếp vào lớp đã kết thúc / đã lưu trữ;
 * - mỗi học viên chỉ học 1 lớp tại một thời điểm: xếp vào lớp mới thì các lớp
 *   ĐANG HỌC khác của học viên chuyển sang "đã rời" (LEFT, có leftAt), mỗi lớp
 *   rời ghi 1 dòng nhật ký. Tất cả trong 1 transaction. */
async function enrollStudentCore(actor: Actor, classId: string, studentId: string) {
  const [student, cls] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true, roles: true, examPackage: true },
    }),
    prisma.class.findUnique({ where: { id: classId }, select: { id: true, code: true, examType: true, status: true } }),
  ]);
  if (!student || !student.roles.includes("STUDENT")) {
    throw new ClassActionError("User này không có role STUDENT.");
  }
  if (!cls) throw new ClassActionError("Không tìm thấy lớp.");
  if (cls.status === "ARCHIVED" || cls.status === "FINISHED") {
    throw new ClassActionError("Lớp đã kết thúc hoặc đã lưu trữ — không xếp thêm học viên được.");
  }
  if (cls.examType !== student.examPackage) {
    throw new ClassActionError("Chỉ xếp được vào lớp cùng gói học");
  }

  const leftClasses = await prisma.$transaction(async (tx) => {
    // Khoá dòng học viên: 2 thao tác xếp lớp cùng lúc cho 1 học viên phải chạy lần
    // lượt, nếu không cả hai cùng thấy "lớp cũ" và học viên kẹt lại ở 2 lớp.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${studentId} FOR UPDATE`;

    // Kiểm tra lại sau khi khoá (phần kiểm tra bên ngoài chỉ để báo lỗi nhanh):
    // - gói học đọc lại khi đang giữ khoá dòng học viên → không lọt lần đổi gói
    //   (quyết định 7B) vừa ghi xong giữa lúc kiểm tra và lúc xếp lớp;
    // - lớp khoá FOR SHARE → thao tác lưu trữ / đổi trạng thái lớp chạy cùng lúc
    //   hoặc đã xong trước (và ta thấy trạng thái mới), hoặc phải chờ ta xong.
    const [lockedStudent, lockedClass] = await Promise.all([
      tx.user.findUnique({ where: { id: studentId }, select: { roles: true, examPackage: true } }),
      tx.$queryRaw<{ status: ClassStatus; examType: string }[]>`
        SELECT "status"::text AS "status", "examType"::text AS "examType" FROM "Class" WHERE "id" = ${classId} FOR SHARE`,
    ]);
    if (!lockedStudent || !lockedStudent.roles.includes("STUDENT")) {
      throw new ClassActionError("User này không có role STUDENT.");
    }
    const lockedCls = lockedClass[0];
    if (!lockedCls) throw new ClassActionError("Không tìm thấy lớp.");
    if (lockedCls.status === "ARCHIVED" || lockedCls.status === "FINISHED") {
      throw new ClassActionError("Lớp đã kết thúc hoặc đã lưu trữ — không xếp thêm học viên được.");
    }
    if (lockedCls.examType !== lockedStudent.examPackage) {
      throw new ClassActionError("Chỉ xếp được vào lớp cùng gói học");
    }

    const [current, others] = await Promise.all([
      tx.classEnrollment.findUnique({
        where: { classId_studentId: { classId, studentId } },
        select: { status: true },
      }),
      tx.classEnrollment.findMany({
        where: { studentId, status: "ACTIVE", classId: { not: classId } },
        select: { id: true, classId: true, class: { select: { code: true } } },
      }),
    ]);
    const alreadyActive = current?.status === "ACTIVE";
    if (alreadyActive && others.length === 0) {
      throw new ClassActionError(`${student.name} đã ở trong lớp ${cls.code}.`);
    }

    if (!alreadyActive) {
      await tx.classEnrollment.upsert({
        where: { classId_studentId: { classId, studentId } },
        update: { status: "ACTIVE", leftAt: null },
        create: { classId, studentId },
      });
      await writeAuditLog(
        {
          actor,
          action: "enroll_student",
          entityType: "Class",
          entityId: classId,
          targetUserId: studentId,
          detail: `Thêm học viên ${student.name} (${student.email})`,
          before: { status: current?.status ?? null },
          after: { status: "ACTIVE", movedFrom: others.map((o) => o.class.code) },
        },
        tx
      );
    }

    const leftAt = new Date();
    const left: { id: string; code: string }[] = [];
    for (const o of others) {
      // Chỉ chuyển dòng còn ĐANG HỌC; nếu dòng đã đổi trạng thái (thao tác khác)
      // thì không ghi đè leftAt và không ghi nhật ký trùng.
      const { count } = await tx.classEnrollment.updateMany({
        where: { id: o.id, status: "ACTIVE" },
        data: { status: "LEFT", leftAt },
      });
      if (count !== 1) continue;
      left.push({ id: o.classId, code: o.class.code });
      await writeAuditLog(
        {
          actor,
          action: "leave_class",
          entityType: "Class",
          entityId: o.classId,
          targetUserId: studentId,
          detail: `Rời lớp ${o.class.code} (chuyển sang ${cls.code})`,
          before: { status: "ACTIVE" },
          after: { status: "LEFT", leftAt: leftAt.toISOString(), movedTo: cls.code },
        },
        tx
      );
    }
    return left;
  });

  revalidateClassPages(classId, ...leftClasses.map((c) => c.id));
  return { student, cls, leftClasses };
}

export async function enrollStudentAction(formData: FormData) {
  const user = await requireCapability("placeStudents");
  const classId = field(formData, "classId");
  const studentId = field(formData, "studentId");
  await enrollStudentCore(actorOf(user), classId, studentId);
}

/** Bản dùng với useActionState: lỗi (khác gói, lớp đã đóng…) hiện ngay trên form. */
export async function enrollStudentFormAction(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const user = await requireCapability("placeStudents");
  const classId = field(formData, "classId");
  const studentId = field(formData, "studentId");
  if (!studentId) return { error: "Chọn học viên cần thêm." };
  try {
    const { student, cls, leftClasses } = await enrollStudentCore(actorOf(user), classId, studentId);
    const moved = leftClasses.length > 0 ? ` (đã chuyển khỏi lớp ${leftClasses.map((c) => c.code).join(", ")})` : "";
    return { success: `Đã thêm ${student.name} vào lớp ${cls.code}${moved}.` };
  } catch (e) {
    if (e instanceof ClassActionError) return { error: e.message };
    throw e;
  }
}

export async function removeEnrollmentAction(formData: FormData) {
  const user = await requireCapability("placeStudents");
  const classId = field(formData, "classId");
  const studentId = field(formData, "studentId");

  if (!classId || !studentId) throw new Error("Học viên không có trong lớp này.");

  const changed = await prisma.$transaction(async (tx) => {
    // Cùng khoá dòng học viên với thao tác xếp lớp: bỏ khỏi lớp và chuyển lớp cho
    // cùng 1 học viên chạy lần lượt, không ghi đè leftAt / ghi nhật ký 2 lần.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${studentId} FOR UPDATE`;
    const enrollment = await tx.classEnrollment.findUnique({
      where: { classId_studentId: { classId, studentId } },
      select: { status: true },
    });
    if (!enrollment) throw new Error("Học viên không có trong lớp này.");
    if (enrollment.status === "LEFT") return false;

    const leftAt = new Date();
    const { count } = await tx.classEnrollment.updateMany({
      where: { classId, studentId, status: enrollment.status },
      data: { status: "LEFT", leftAt },
    });
    if (count !== 1) return false;
    await writeAuditLog(
      {
        actor: actorOf(user),
        action: "remove_enrollment",
        entityType: "Class",
        entityId: classId,
        targetUserId: studentId,
        detail: `Bỏ học viên khỏi lớp (userId: ${studentId})`,
        before: { status: enrollment.status },
        after: { status: "LEFT", leftAt: leftAt.toISOString() },
      },
      tx
    );
    return true;
  });
  if (changed) revalidateClassPages(classId);
}
