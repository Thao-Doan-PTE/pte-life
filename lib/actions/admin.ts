"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Role } from "@/lib/generated/prisma/enums";
import { writeAuditLog } from "@/lib/admin/audit";
import { requireCapability } from "@/lib/admin/permissions";
import { endOfVnDay, formatVnDate, isReserved, PACKAGE_LABEL, RESERVATION_DAYS } from "@/lib/admin/student-status";
import type { ExamPackage } from "@/lib/question-types";
import { isTuTrialActive } from "@/lib/student-access";
import { TU_TRIAL_BULK_MAX, TU_TRIAL_DAY_CHOICES } from "@/components/admin/students/student-format";

// Mọi hàm export trong file "use server" là endpoint HTTP công khai → mỗi hàm
// PHẢI tự gọi requireCapability trước (3 thao tác gói học + điểm mục tiêu:
// managePlans = Admin + Vận hành/CSKH theo HANDOFF mục 3).

/* ---------------------------------------------------------------------------
 * Phần lõi của 3 thao tác gói học. Nội dung ghi ReservationLog (action, detail,
 * định dạng ngày toLocaleDateString("vi-VN")) GIỮ NGUYÊN như bản cũ — chỉ thêm:
 * cập nhật user + ghi log trong cùng 1 transaction, ghi kiểu so-sánh-rồi-ghi
 * (chỉ cập nhật khi dữ liệu chưa bị thao tác khác đổi kể từ lúc đọc) để 2 thao
 * tác chạy cùng lúc không ghi đè mất nhau hay dùng quá số lượt bảo lưu, và ghi
 * THÊM 1 dòng AuditLog (trước/sau, IP…) trong cùng transaction.
 * ------------------------------------------------------------------------- */

const RESERVATION_EXTENSION_DAYS = 30;

/** Số lần đọc lại & thử ghi khi bị thao tác khác chen vào giữa. */
const MAX_WRITE_ATTEMPTS = 3;

const CONFLICT_MESSAGE = "Dữ liệu học viên vừa được cập nhật ở nơi khác, vui lòng thử lại.";
const NO_RESERVATION_MESSAGE = "Học viên đã hết lượt bảo lưu.";

/** Giới hạn trên của 1 lần gia hạn (chặn gõ nhầm số quá lớn). */
const MAX_EXTEND_DAYS = 3650;

const STUDENT_NOT_FOUND_MESSAGE = "Không tìm thấy học viên.";
const INVALID_PACKAGE_MESSAGE = "Gói học không hợp lệ.";

/** Điểm mục tiêu PTE hợp lệ (thang 10–90). */
const TARGET_SCORE_MIN = 10;
const TARGET_SCORE_MAX = 90;

type Actor = { id: string; roles: Role[] };

/** Các trang hiển thị dữ liệu gói học / nhật ký — làm mới sau mỗi thao tác. */
function revalidatePlanPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath("/admin/logs");
}

/** Số ngày gia hạn hợp lệ: số nguyên > 0 (HANDOFF mục 5 — không gia hạn được ≤ 0 hay số lẻ). */
function parseExtendDays(raw: FormDataEntryValue | null): number | null {
  const days = Number(raw);
  return Number.isInteger(days) && days > 0 ? days : null;
}

function isExamPackage(v: string): v is ExamPackage {
  return v === "academic" || v === "core";
}

function fieldOf(formData: FormData, name: string): string {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Chỉ thao tác trên tài khoản có vai trò STUDENT — chặn sửa gói / ghi log
 * bảo lưu cho tài khoản nhân sự hay admin qua userId tuỳ ý. */
function findStudent(userId: string) {
  if (!userId) return Promise.resolve(null);
  return prisma.user.findFirst({
    where: { id: userId, roles: { has: "STUDENT" } },
    select: { id: true, examPackage: true, reservationsLeft: true },
  });
}

/** Ảnh chụp các trường gói học để ghi before/after vào AuditLog. */
interface PlanSnapshot {
  examPackage: ExamPackage;
  expiresAt: Date;
  reservationsLeft: number;
  reservedUntil: Date | null;
}

const PLAN_SELECT = { examPackage: true, expiresAt: true, reservationsLeft: true, reservedUntil: true } as const;

function snapshotJson(s: PlanSnapshot): Prisma.InputJsonObject {
  return {
    examPackage: s.examPackage,
    expiresAt: s.expiresAt.toISOString(),
    reservationsLeft: s.reservationsLeft,
    reservedUntil: s.reservedUntil ? s.reservedUntil.toISOString() : null,
  };
}

async function applyPackageChange(actor: Actor, userId: string, examPackage: ExamPackage) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: PLAN_SELECT });
    await tx.user.update({
      where: { id: userId },
      data: { examPackage },
    });
    const detail = `Đổi gói học sang ${examPackage === "academic" ? "PTE Academic" : "PTE Core"}`;
    await tx.reservationLog.create({
      data: {
        userId,
        performedById: actor.id,
        action: "change_package",
        detail,
      },
    });
    await writeAuditLog(
      {
        actor,
        action: "change_package",
        entityType: "User",
        entityId: userId,
        targetUserId: userId,
        detail,
        before: snapshotJson(before),
        after: snapshotJson({ ...before, examPackage }),
      },
      tx
    );
  });
}

/** Trả về hạn mới. Ném lỗi nếu không tìm thấy user (như bản cũ) hoặc bị chen ngang quá số lần thử. */
async function applyExtend(actor: Actor, userId: string, days: number): Promise<Date> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const newExpiry = new Date(user.expiresAt.getTime() + days * 24 * 60 * 60 * 1000);

      const { count } = await tx.user.updateMany({
        where: { id: userId, expiresAt: user.expiresAt },
        data: { expiresAt: newExpiry },
      });
      if (count === 0) return null; // hạn vừa bị đổi ở nơi khác → đọc lại và thử lại
      const detail = `Gia hạn ${days} ngày (hạn mới: ${newExpiry.toLocaleDateString("vi-VN")})`;
      await tx.reservationLog.create({
        data: {
          userId,
          performedById: actor.id,
          action: "extend",
          detail,
        },
      });
      await writeAuditLog(
        {
          actor,
          action: "extend",
          entityType: "User",
          entityId: userId,
          targetUserId: userId,
          detail,
          before: snapshotJson(user),
          after: snapshotJson({ ...user, expiresAt: newExpiry }),
        },
        tx
      );
      return newExpiry;
    });
    if (result) return result;
  }
  throw new Error(CONFLICT_MESSAGE);
}

type ReservationOutcome =
  | { ok: true; newExpiry: Date; reservedUntil: Date }
  | { ok: false; reason: "none_left" };

/** reservedUntil mới cho 1 lượt bảo lưu (quyết định 5B — chỉ để hiện nhãn "Bảo lưu đến …"):
 * - Chưa bảo lưu: hết ngày (giờ VN) hôm nay + 30 ngày.
 * - Đang bảo lưu: cộng dồn — từ max(reservedUntil hiện tại, hết ngày hôm nay) + 30 ngày.
 * - Luôn chặn trên ở hết ngày (giờ VN) của hạn mới, để nhãn "Bảo lưu" không che một
 *   học viên thực ra đã hết hạn (VD: hết hạn 10 ngày rồi mới bảo lưu → hạn mới chỉ
 *   còn 20 ngày nên bảo lưu cũng chỉ tới hết ngày thứ 20). */
function nextReservedUntil(currentReservedUntil: Date | null, newExpiry: Date, now: Date = new Date()): Date {
  const endOfToday = endOfVnDay(0, now);
  const base =
    currentReservedUntil && isReserved(currentReservedUntil, now) && currentReservedUntil > endOfToday
      ? currentReservedUntil
      : endOfToday;
  const stacked = endOfVnDay(RESERVATION_DAYS, base);
  const cap = endOfVnDay(0, newExpiry);
  return stacked.getTime() <= cap.getTime() ? stacked : cap;
}

/** Trừ 1 lượt bảo lưu + cộng 30 ngày (như cũ), và gắn reservedUntil theo
 * nextReservedUntil (quyết định 5B). Điều kiện trong câu UPDATE (reservationsLeft,
 * expiresAt và reservedUntil đúng như lúc đọc) bảo đảm 2 lần bấm cùng lúc không
 * dùng được quá số lượt còn lại. */
async function applyReservation(actor: Actor, userId: string): Promise<ReservationOutcome> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const result = await prisma.$transaction(async (tx): Promise<ReservationOutcome | null> => {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.reservationsLeft <= 0) return { ok: false, reason: "none_left" };

      const newExpiry = new Date(
        user.expiresAt.getTime() + RESERVATION_EXTENSION_DAYS * 24 * 60 * 60 * 1000
      );
      const reservedUntil = nextReservedUntil(user.reservedUntil, newExpiry);

      const { count } = await tx.user.updateMany({
        where: {
          id: userId,
          reservationsLeft: user.reservationsLeft,
          expiresAt: user.expiresAt,
          reservedUntil: user.reservedUntil,
        },
        data: {
          reservationsLeft: user.reservationsLeft - 1,
          expiresAt: newExpiry,
          reservedUntil,
        },
      });
      if (count === 0) return null; // vừa bị thao tác khác chen vào → đọc lại và thử lại
      const detail = `Dùng 1 lượt bảo lưu, gia hạn ${RESERVATION_EXTENSION_DAYS} ngày (hạn mới: ${newExpiry.toLocaleDateString("vi-VN")})`;
      await tx.reservationLog.create({
        data: {
          userId,
          performedById: actor.id,
          action: "reservation",
          detail,
        },
      });
      await writeAuditLog(
        {
          actor,
          action: "reservation",
          entityType: "User",
          entityId: userId,
          targetUserId: userId,
          detail,
          before: snapshotJson(user),
          after: snapshotJson({
            ...user,
            reservationsLeft: user.reservationsLeft - 1,
            expiresAt: newExpiry,
            reservedUntil,
          }),
        },
        tx
      );
      return { ok: true, newExpiry, reservedUntil };
    });
    if (result) return result;
  }
  throw new Error(CONFLICT_MESSAGE);
}

/* ---------------------------------------------------------------------------
 * 3 thao tác gốc (form action, trả về void / ném lỗi như trước). Giữ nguyên tên
 * trường FormData: userId, examPackage, days. Hiện không còn giao diện nào gọi
 * nhưng vẫn là endpoint công khai → kiểm tra đầu vào giống bản submit* bên dưới.
 * ------------------------------------------------------------------------- */

export async function changePackageAction(formData: FormData) {
  const admin = await requireCapability("managePlans");
  const userId = fieldOf(formData, "userId");
  const examPackage = fieldOf(formData, "examPackage");
  if (!isExamPackage(examPackage)) throw new Error(INVALID_PACKAGE_MESSAGE);
  if (!(await findStudent(userId))) throw new Error(STUDENT_NOT_FOUND_MESSAGE);

  await applyPackageChange(admin, userId, examPackage);
  revalidatePlanPages();
}

export async function extendExpiryAction(formData: FormData) {
  const admin = await requireCapability("managePlans");
  const userId = fieldOf(formData, "userId");
  const days = parseExtendDays(formData.get("days"));
  if (days === null || days > MAX_EXTEND_DAYS) return;
  if (!(await findStudent(userId))) throw new Error(STUDENT_NOT_FOUND_MESSAGE);

  await applyExtend(admin, userId, days);
  revalidatePlanPages();
}

export async function useReservationAction(formData: FormData) {
  const admin = await requireCapability("managePlans");
  const userId = fieldOf(formData, "userId");
  if (!(await findStudent(userId))) throw new Error(STUDENT_NOT_FOUND_MESSAGE);

  const outcome = await applyReservation(admin, userId);
  if (!outcome.ok) {
    throw new Error(NO_RESERVATION_MESSAGE);
  }
  revalidatePlanPages();
}

/* ---------------------------------------------------------------------------
 * Bản trả kết quả {ok, message} cho drawer hồ sơ học viên (/admin/students):
 * cùng phần lõi + cùng nội dung log như 3 thao tác gốc, thêm kiểm tra đầu vào
 * để báo lỗi rõ ràng ngay trên giao diện thay vì ném lỗi.
 * ------------------------------------------------------------------------- */

export interface PlanActionResult {
  ok: boolean;
  message: string;
}

const STUDENT_NOT_FOUND: PlanActionResult = { ok: false, message: STUDENT_NOT_FOUND_MESSAGE };

export async function submitChangePackage(formData: FormData): Promise<PlanActionResult> {
  const admin = await requireCapability("managePlans");
  const userId = fieldOf(formData, "userId");
  const examPackage = fieldOf(formData, "examPackage");
  if (!isExamPackage(examPackage)) return { ok: false, message: INVALID_PACKAGE_MESSAGE };

  const student = await findStudent(userId);
  if (!student) return STUDENT_NOT_FOUND;
  // Không đổi gì thì không ghi log (HANDOFF: "Gói không thay đổi").
  if (student.examPackage === examPackage) return { ok: true, message: "Gói không thay đổi." };

  await applyPackageChange(admin, userId, examPackage);
  revalidatePlanPages();
  return { ok: true, message: `Đã đổi sang ${PACKAGE_LABEL[examPackage]}.` };
}

export async function submitExtendExpiry(formData: FormData): Promise<PlanActionResult> {
  const admin = await requireCapability("managePlans");
  const userId = fieldOf(formData, "userId");
  const days = parseExtendDays(formData.get("days"));
  if (days === null) return { ok: false, message: "Nhập số ngày là số nguyên lớn hơn 0." };
  if (days > MAX_EXTEND_DAYS) {
    return { ok: false, message: `Mỗi lần gia hạn tối đa ${MAX_EXTEND_DAYS} ngày.` };
  }

  if (!(await findStudent(userId))) return STUDENT_NOT_FOUND;

  let newExpiry: Date;
  try {
    newExpiry = await applyExtend(admin, userId, days);
  } catch (e) {
    if (e instanceof Error && e.message === CONFLICT_MESSAGE) return { ok: false, message: CONFLICT_MESSAGE };
    throw e;
  }
  revalidatePlanPages();
  return { ok: true, message: `Đã gia hạn ${days} ngày, hạn mới ${formatVnDate(newExpiry)}.` };
}

export async function submitUseReservation(formData: FormData): Promise<PlanActionResult> {
  const admin = await requireCapability("managePlans");
  const userId = fieldOf(formData, "userId");

  if (!(await findStudent(userId))) return STUDENT_NOT_FOUND;

  let outcome: ReservationOutcome;
  try {
    outcome = await applyReservation(admin, userId);
  } catch (e) {
    if (e instanceof Error && e.message === CONFLICT_MESSAGE) return { ok: false, message: CONFLICT_MESSAGE };
    throw e;
  }
  if (!outcome.ok) return { ok: false, message: NO_RESERVATION_MESSAGE };

  revalidatePlanPages();
  return {
    ok: true,
    message:
      `Đã dùng 1 lượt bảo lưu, hạn mới ${formatVnDate(outcome.newExpiry)}` +
      // Hạn mới vẫn đã qua (hết hạn quá 30 ngày) → reservedUntil bị chặn về quá khứ, không hiện "bảo lưu đến".
      (isReserved(outcome.reservedUntil) ? ` · bảo lưu đến ${formatVnDate(outcome.reservedUntil)}.` : "."),
  };
}

/* ---------------------------------------------------------------------------
 * Điểm mục tiêu riêng của học viên (User.targetScore, thang 10–90). Để trống =
 * xoá → cột "Đầu vào → mục tiêu" quay về điểm mục tiêu của lớp đang học.
 * ------------------------------------------------------------------------- */

/** "" → null (xoá); số nguyên 10–90 → số; còn lại → undefined (không hợp lệ). */
function parseTargetScore(raw: string): number | null | undefined {
  if (raw === "") return null;
  if (!/^\d{1,3}$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= TARGET_SCORE_MIN && n <= TARGET_SCORE_MAX ? n : undefined;
}

export async function setTargetScoreAction(formData: FormData): Promise<PlanActionResult> {
  const admin = await requireCapability("managePlans");
  const userId = fieldOf(formData, "userId");
  const targetScore = parseTargetScore(fieldOf(formData, "targetScore"));
  if (targetScore === undefined) {
    return {
      ok: false,
      message: `Điểm mục tiêu là số nguyên từ ${TARGET_SCORE_MIN} đến ${TARGET_SCORE_MAX} (để trống để xoá).`,
    };
  }
  if (!userId) return STUDENT_NOT_FOUND;

  const outcome = await prisma.$transaction(async (tx): Promise<"not_found" | "unchanged" | "saved"> => {
    const student = await tx.user.findFirst({
      where: { id: userId, roles: { has: "STUDENT" } },
      select: { id: true, targetScore: true },
    });
    if (!student) return "not_found";
    if (student.targetScore === targetScore) return "unchanged";

    await tx.user.update({ where: { id: userId }, data: { targetScore } });
    const prev = student.targetScore ?? "—";
    await writeAuditLog(
      {
        actor: admin,
        action: "set_target_score",
        entityType: "User",
        entityId: userId,
        targetUserId: userId,
        detail:
          targetScore === null
            ? `Xoá điểm mục tiêu riêng (trước: ${prev})`
            : `Đặt điểm mục tiêu ${targetScore} (trước: ${prev})`,
        before: { targetScore: student.targetScore },
        after: { targetScore },
      },
      tx
    );
    return "saved";
  });

  if (outcome === "not_found") return STUDENT_NOT_FOUND;
  if (outcome === "unchanged") return { ok: true, message: "Điểm mục tiêu không thay đổi." };

  revalidatePath("/admin/students");
  revalidatePath("/admin/logs");
  return {
    ok: true,
    message: targetScore === null ? "Đã xoá điểm mục tiêu riêng." : `Đã lưu điểm mục tiêu ${targetScore}.`,
  };
}

/* ---------------------------------------------------------------------------
 * Danh sách mời dùng thử Luyện đề Tủ (User.tuTrialUntil — quyền "tu-trial" ở
 * lib/student-access.ts): tài khoản học viên, kể cả chưa xếp lớp, được vào bộ đề
 * Tủ (WFD, RS) và thi thử Đề Tủ tới hết ngày đã đặt. Hạn mới luôn tính từ hôm
 * nay: hết ngày (giờ VN) của hôm nay + N ngày; "clear" = tắt (null).
 * Ghi kiểu so-sánh-rồi-ghi như phần gói học để before/after trong AuditLog luôn
 * đúng khi 2 thao tác chạy cùng lúc.
 * Danh sách số ngày + giới hạn hàng loạt dùng chung với UI (student-format.ts):
 * file "use server" chỉ không được EXPORT giá trị không phải hàm async, import
 * hằng số thì bình thường — nên chỉ có 1 nguồn, UI và server không lệch nhau.
 * ------------------------------------------------------------------------- */

/** Id tài khoản (cuid ~25 ký tự) — chặn chuỗi rác quá dài gửi thẳng vào truy vấn. */
const MAX_USER_ID_LENGTH = 64;

const INVALID_TU_TRIAL_DAYS_MESSAGE = `Chọn thời gian dùng thử ${TU_TRIAL_DAY_CHOICES.slice(0, -1).join(", ")} hoặc ${
  TU_TRIAL_DAY_CHOICES[TU_TRIAL_DAY_CHOICES.length - 1]
} ngày.`;

/** Kết quả thao tác dùng thử Tủ; neutral = không có gì thay đổi (không tô xanh/đỏ). */
export interface TuTrialActionResult extends PlanActionResult {
  neutral?: boolean;
}

/** "clear" → null (tắt); số ngày trong TU_TRIAL_DAY_CHOICES → số; còn lại → undefined. */
function parseTuTrialDays(raw: string): number | null | undefined {
  if (raw === "clear") return null;
  if (!/^\d{1,2}$/.test(raw)) return undefined;
  const days = Number(raw);
  return (TU_TRIAL_DAY_CHOICES as readonly number[]).includes(days) ? days : undefined;
}

function sameInstant(a: Date | null, b: Date | null): boolean {
  return a === null || b === null ? a === b : a.getTime() === b.getTime();
}

function tuTrialDetail(before: Date | null, after: Date | null, days: number | null, now: Date, bulk: boolean): string {
  const suffix = bulk ? " — thao tác hàng loạt" : "";
  if (after === null || days === null) {
    const prev = before
      ? ` (trước: đến ${formatVnDate(before)}${isTuTrialActive(before, now) ? "" : ", đã hết hạn"})`
      : "";
    return `Tắt dùng thử Luyện đề Tủ${prev}${suffix}`;
  }
  const until = formatVnDate(after);
  return before && isTuTrialActive(before, now)
    ? `Gia hạn dùng thử Luyện đề Tủ ${days} ngày tính từ hôm nay (đến ${until}; trước: đến ${formatVnDate(before)})${suffix}`
    : `Mời dùng thử Luyện đề Tủ ${days} ngày (đến ${until})${suffix}`;
}

/** "longer" = (chỉ thao tác hàng loạt) học viên đang có hạn dùng thử dài hơn hạn
 * mới → giữ nguyên, không rút ngắn. */
type TuTrialWrite = "saved" | "unchanged" | "longer" | "not_found" | "conflict";

/** Đặt tuTrialUntil = next cho 1 học viên trong transaction `tx`. `known` = giá
 * trị vừa đọc (undefined = tự đọc). Chỉ ghi khi giá trị trong DB vẫn đúng như lúc
 * đọc; bị chen ngang thì đọc lại và thử lại. Có thay đổi mới ghi AuditLog.
 * `bulk` = thao tác hàng loạt: KHÔNG rút ngắn hạn dùng thử còn hiệu lực dài hơn
 * hạn mới (rút ngắn chỉ làm có chủ đích trong drawer, nơi có cảnh báo). */
async function writeTuTrial(
  tx: Prisma.TransactionClient,
  actor: Actor,
  userId: string,
  known: Date | null | undefined,
  next: Date | null,
  days: number | null,
  now: Date,
  bulk: boolean
): Promise<TuTrialWrite> {
  let before = known;
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    if (before === undefined) {
      const fresh = await tx.user.findFirst({
        where: { id: userId, roles: { has: "STUDENT" } },
        select: { tuTrialUntil: true },
      });
      if (!fresh) return "not_found";
      before = fresh.tuTrialUntil;
    }
    if (sameInstant(before, next)) return "unchanged";
    if (bulk && next !== null && before !== null && isTuTrialActive(before, now) && before.getTime() > next.getTime()) {
      return "longer";
    }

    const { count } = await tx.user.updateMany({
      where: { id: userId, roles: { has: "STUDENT" }, tuTrialUntil: before },
      data: { tuTrialUntil: next },
    });
    if (count === 1) {
      await writeAuditLog(
        {
          actor,
          action: "set_tu_trial",
          entityType: "User",
          entityId: userId,
          targetUserId: userId,
          detail: tuTrialDetail(before, next, days, now, bulk),
          before: { tuTrialUntil: before ? before.toISOString() : null },
          after: { tuTrialUntil: next ? next.toISOString() : null },
        },
        tx
      );
      return "saved";
    }
    before = undefined; // vừa bị đổi ở nơi khác (hoặc mất role STUDENT) → đọc lại
  }
  return "conflict";
}

function revalidateTuTrialPages() {
  revalidatePath("/admin/students");
  revalidatePath("/admin/logs");
}

/** Mời / gia hạn / tắt dùng thử Luyện đề Tủ cho 1 học viên (drawer hồ sơ).
 * FormData: userId, days ∈ TU_TRIAL_DAY_CHOICES hoặc "clear". Hạn mới có thể
 * sớm hơn hạn hiện tại (drawer đã cảnh báo trước khi bấm). */
export async function setTuTrialAction(formData: FormData): Promise<TuTrialActionResult> {
  const admin = await requireCapability("managePlans");
  const userId = fieldOf(formData, "userId");
  const days = parseTuTrialDays(fieldOf(formData, "days"));
  if (days === undefined) return { ok: false, message: INVALID_TU_TRIAL_DAYS_MESSAGE };
  if (!userId || userId.length > MAX_USER_ID_LENGTH) return STUDENT_NOT_FOUND;

  const now = new Date();
  const next = days === null ? null : endOfVnDay(days, now);
  const outcome = await prisma.$transaction((tx) =>
    writeTuTrial(tx, admin, userId, undefined, next, days, now, false)
  );

  if (outcome === "not_found") return STUDENT_NOT_FOUND;
  if (outcome === "conflict") return { ok: false, message: CONFLICT_MESSAGE };
  if (outcome === "unchanged") {
    return {
      ok: true,
      neutral: true,
      message: next === null ? "Học viên chưa được mời dùng thử." : "Hạn dùng thử không thay đổi.",
    };
  }

  revalidateTuTrialPages();
  return {
    ok: true,
    message:
      next === null
        ? "Đã tắt dùng thử Luyện đề Tủ."
        : `Đã mở dùng thử Luyện đề Tủ đến hết ngày ${formatVnDate(next)}.`,
  };
}

/** Mời / tắt dùng thử Luyện đề Tủ cho nhiều học viên (bảng học viên).
 * FormData: userIds (lặp lại, tối đa TU_TRIAL_BULK_MAX), days ∈ TU_TRIAL_DAY_CHOICES
 * hoặc "clear". Mỗi học viên thay đổi ghi 1 dòng AuditLog; tài khoản không phải
 * học viên bị bỏ qua; học viên đang có hạn dài hơn hạn mới được giữ nguyên. */
export async function bulkSetTuTrialAction(formData: FormData): Promise<TuTrialActionResult> {
  const admin = await requireCapability("managePlans");
  const days = parseTuTrialDays(fieldOf(formData, "days"));
  if (days === undefined) return { ok: false, message: INVALID_TU_TRIAL_DAYS_MESSAGE };

  const raw = formData.getAll("userIds");
  if (raw.length === 0) return { ok: false, message: "Chọn ít nhất 1 học viên." };
  if (raw.length > TU_TRIAL_BULK_MAX) {
    return { ok: false, message: `Mỗi lần chỉ chọn tối đa ${TU_TRIAL_BULK_MAX} học viên.` };
  }
  const ids = [...new Set(raw.map((v) => (typeof v === "string" ? v.trim() : "")))];
  if (ids.some((id) => !id || id.length > MAX_USER_ID_LENGTH)) {
    return { ok: false, message: "Danh sách học viên không hợp lệ." };
  }

  const now = new Date();
  const next = days === null ? null : endOfVnDay(days, now);
  const tally = await prisma.$transaction(
    async (tx) => {
      const students = await tx.user.findMany({
        where: { id: { in: ids }, roles: { has: "STUDENT" } },
        select: { id: true, tuTrialUntil: true },
      });
      const counts: Record<TuTrialWrite, number> = {
        saved: 0,
        unchanged: 0,
        longer: 0,
        not_found: ids.length - students.length,
        conflict: 0,
      };
      for (const s of students) {
        counts[await writeTuTrial(tx, admin, s.id, s.tuTrialUntil, next, days, now, true)]++;
      }
      return counts;
    },
    // Tối đa 200 học viên × (cập nhật + nhật ký) chạy tuần tự trong 1 transaction.
    { maxWait: 10_000, timeout: 60_000 }
  );

  if (tally.saved > 0) revalidateTuTrialPages();

  const head =
    next === null
      ? tally.saved > 0
        ? `Đã tắt dùng thử Luyện đề Tủ cho ${tally.saved} học viên.`
        : "Không có học viên nào cần tắt dùng thử."
      : tally.saved > 0
        ? `Đã mời ${tally.saved} học viên dùng thử Luyện đề Tủ đến hết ngày ${formatVnDate(next)}.`
        : "Không có học viên nào thay đổi hạn dùng thử.";
  const notes: string[] = [];
  if (tally.unchanged > 0) {
    notes.push(
      next === null
        ? `${tally.unchanged} học viên chưa được mời`
        : `${tally.unchanged} học viên đã có đúng hạn này`
    );
  }
  if (tally.longer > 0) notes.push(`${tally.longer} học viên đang có hạn dài hơn, giữ nguyên`);
  if (tally.not_found > 0) notes.push(`${tally.not_found} tài khoản không phải học viên, đã bỏ qua`);
  if (tally.conflict > 0) notes.push(`${tally.conflict} học viên vừa được cập nhật ở nơi khác, vui lòng thử lại`);

  return {
    ok: tally.conflict === 0,
    neutral: tally.saved === 0 && tally.conflict === 0,
    message: notes.length > 0 ? `${head} (${notes.join("; ")}.)` : head,
  };
}
