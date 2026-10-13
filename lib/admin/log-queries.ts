import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Role } from "@/lib/generated/prisma/enums";
import { staffRoleLabel } from "@/lib/admin/permissions";
import { formatVnDateTime } from "@/lib/admin/student-status";

/** Đọc gộp 2 bảng nhật ký cho trang /admin/logs (HANDOFF.md mục 4.9):
 * - ReservationLog: đổi gói / gia hạn / bảo lưu (lib/actions/admin.ts) — hiển thị
 *   đúng như trang cũ: "<tên học viên> — <detail>". Phần "Chi tiết" (trước/sau,
 *   IP, vai trò lúc thao tác) lấy từ dòng AuditLog ghi kèm cùng thao tác nếu có.
 * - AuditLog: lớp học, người dùng, bài tập, chấm bài, ngân hàng đề…
 * CHỈ ĐỌC — không ghi/sửa/xoá gì ở 2 bảng này. Module server thường (không phải
 * "use server"): chỉ gọi từ trang đã requireAdminPage("viewLogs"). */

export const LOG_PAGE_SIZE = 50;

export type LogCategory = "plan" | "class" | "user" | "assignment" | "grading" | "question" | "other";
export type LogTypeFilter = "all" | "plan" | "class" | "user" | "assignment" | "grading";

export const LOG_CATEGORY_LABEL: Record<LogCategory, string> = {
  plan: "Gói học",
  class: "Lớp học",
  user: "Người dùng",
  assignment: "Bài tập",
  grading: "Chấm bài",
  question: "Ngân hàng đề",
  other: "Khác",
};

export const LOG_TYPE_FILTERS: { value: LogTypeFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "plan", label: "Gói học" },
  { value: "class", label: "Lớp học" },
  { value: "user", label: "Người dùng" },
  { value: "assignment", label: "Bài tập" },
  { value: "grading", label: "Chấm bài" },
];

export function parseLogTypeFilter(value: string | undefined): LogTypeFilter {
  return LOG_TYPE_FILTERS.some((f) => f.value === value) ? (value as LogTypeFilter) : "all";
}

/** AuditLog.entityType thuộc từng nhóm (nhóm "plan" chỉ đọc ReservationLog). */
const CATEGORY_ENTITY_TYPES = {
  class: ["Class", "ClassTeacher", "ClassEnrollment"],
  user: ["User", "TeacherProfile"],
  assignment: ["Assignment", "AssignmentItem", "AssignmentRecipient"],
  grading: ["PracticeAttempt", "GradingRubric", "AttemptGrade"],
  question: ["Question", "QuestionType"],
} satisfies Record<Exclude<LogCategory, "plan" | "other">, string[]>;

/** Action gói học (tên giống ReservationLog). writeAuditLog (lib/admin/audit.ts) ghi
 * THÊM 1 dòng AuditLog bên cạnh ReservationLog cho các thao tác này → ReservationLog
 * là nguồn duy nhất của nhóm "Gói học"; các dòng AuditLog cùng action bị loại khỏi
 * danh sách để mỗi thao tác chỉ hiện 1 lần (chỉ dùng làm "Chi tiết" cho dòng gói học). */
const PLAN_ACTIONS = ["change_package", "extend", "reservation"];

/** Dòng AuditLog đi kèm 1 dòng ReservationLog được ghi trong cùng thao tác —
 * ghép theo action + học viên + người làm, lệch thời gian tối đa chừng này. */
const PLAN_AUDIT_MATCH_MS = 10_000;

/** Nhãn cho các action AuditLog (dùng khi detail trống). */
const AUDIT_ACTION_LABEL: Record<string, string> = {
  create_class: "Tạo lớp",
  archive_class: "Lưu trữ lớp",
  assign_teacher: "Gán giáo viên",
  remove_teacher: "Bỏ giáo viên khỏi lớp",
  enroll_student: "Thêm học viên vào lớp",
  remove_enrollment: "Bỏ học viên khỏi lớp",
  update_roles: "Đổi role",
  toggle_status: "Đổi trạng thái tài khoản",
  create_assignment: "Giao bài tập",
  update_assignment_status: "Đổi trạng thái bài tập",
  grade_attempt: "Chấm bài",
  update_rubric: "Cập nhật rubric chấm",
  delete_question: "Xoá câu hỏi",
  bulk_delete_questions: "Xoá nhiều câu hỏi",
  import_questions: "Nhập câu hỏi",
};

/** Một số log cũ ghi "(userId: <id>)" trong detail — đổi sang tên khi hiển thị. */
const USER_ID_IN_DETAIL = /\(userId: ([A-Za-z0-9_-]+)\)/g;

function auditCategory(entityType: string): LogCategory {
  for (const [category, types] of Object.entries(CATEGORY_ENTITY_TYPES)) {
    if ((types as string[]).includes(entityType)) return category as LogCategory;
  }
  return "other";
}

/** Điều kiện lọc AuditLog theo nhóm — phải khớp với auditCategory. Nhóm "plan"
 * không lấy dòng AuditLog nào (xem PLAN_ACTIONS). */
function auditTypeWhere(type: Exclude<LogTypeFilter, "plan">): Prisma.AuditLogWhereInput {
  const base: Prisma.AuditLogWhereInput = { action: { notIn: PLAN_ACTIONS } };
  return type === "all" ? base : { ...base, entityType: { in: CATEGORY_ENTITY_TYPES[type] } };
}

/* ---------- Trước → sau ---------- */

export interface LogChange {
  /** Tên trường ("" khi dữ liệu không phải object — so sánh cả khối). */
  key: string;
  before: string;
  after: string;
}

export interface LogDetails {
  changes: LogChange[];
  ip: string | null;
}

type JsonValue = Prisma.JsonValue;
type JsonObject = { [key: string]: JsonValue };

const MAX_VALUE_CHARS = 400;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function isJsonObject(v: JsonValue | undefined): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Giá trị JSON → chuỗi ngắn gọn để hiển thị (ngày ISO đổi sang giờ VN). */
function formatJsonValue(v: JsonValue | undefined): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return ISO_DATETIME.test(v) ? formatVnDateTime(v) : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  const s = JSON.stringify(v, null, 2);
  return s.length > MAX_VALUE_CHARS ? `${s.slice(0, MAX_VALUE_CHARS)}…` : s;
}

function sameJson(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Các trường thay đổi giữa before và after (so sánh trường cấp 1). Thêm mới
 * (before trống) / xoá (after trống) hiện mọi trường của phía còn lại. */
export function diffJson(before: JsonValue | null, after: JsonValue | null): LogChange[] {
  if (before === null && after === null) return [];
  const objectShaped = (isJsonObject(before) || before === null) && (isJsonObject(after) || after === null);
  if (!objectShaped) {
    return sameJson(before, after) ? [] : [{ key: "", before: formatJsonValue(before), after: formatJsonValue(after) }];
  }
  const b: JsonObject = isJsonObject(before) ? before : {};
  const a: JsonObject = isJsonObject(after) ? after : {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return keys
    .filter((k) => !sameJson(b[k], a[k]))
    .map((k) => ({
      key: k,
      before: k in b ? formatJsonValue(b[k]) : "—",
      after: k in a ? formatJsonValue(a[k]) : "—",
    }));
}

function detailsOf(row: { before: JsonValue | null; after: JsonValue | null; ip: string | null }): LogDetails | null {
  const changes = diffJson(row.before, row.after);
  const ip = row.ip && row.ip !== "unknown" ? row.ip : null;
  return changes.length > 0 || ip ? { changes, ip } : null;
}

/* ---------- Trang nhật ký ---------- */

export interface LogEntry {
  /** "r_<id>" (ReservationLog) hoặc "a_<id>" (AuditLog). */
  key: string;
  createdAt: Date;
  content: string;
  category: LogCategory;
  actorName: string;
  actorRoleLabel: string;
  /** true = vai trò lấy theo quyền hiện tại của tài khoản (dòng cũ chưa lưu vai trò lúc thao tác). */
  actorRoleIsCurrent: boolean;
  /** Người bị tác động (AuditLog.targetUserId) — chỉ khi tên chưa có trong nội dung. */
  targetName: string | null;
  /** Dữ liệu trước → sau + IP; null = không có gì để xem thêm. */
  details: LogDetails | null;
}

export interface LogPage {
  entries: LogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

function roleLabelOf(roles: Role[] | undefined): string {
  if (!roles) return "";
  return staffRoleLabel({ roles }) || (roles.includes("STUDENT") ? "Học viên" : "");
}

/** Vai trò lúc thao tác nếu dòng nhật ký có lưu; nếu không thì quyền hiện tại. */
function actorRole(stored: Role[] | undefined, current: Role[] | undefined): { label: string; isCurrent: boolean } {
  if (stored && stored.length > 0) return { label: roleLabelOf(stored), isCurrent: false };
  const label = roleLabelOf(current);
  return { label, isCurrent: label !== "" };
}

export async function getActivityLogPage({
  type,
  q,
  page,
}: {
  type: LogTypeFilter;
  q: string;
  page: number;
}): Promise<LogPage> {
  const query = q.trim().slice(0, 100);
  const includeReservation = type === "all" || type === "plan";

  // Tìm kiếm theo nội dung: detail, tên/email học viên đích, tên người thao tác,
  // mã/tên lớp (với log lớp học).
  let reservationSearch: Prisma.ReservationLogWhereInput = {};
  let auditSearch: Prisma.AuditLogWhereInput = {};
  if (query) {
    const text = { contains: query, mode: "insensitive" as const };
    const [matchedUsers, matchedClasses] = await Promise.all([
      prisma.user.findMany({ where: { OR: [{ name: text }, { email: text }] }, select: { id: true }, take: 200 }),
      prisma.class.findMany({ where: { OR: [{ code: text }, { name: text }] }, select: { id: true }, take: 200 }),
    ]);
    const userIds = matchedUsers.map((u) => u.id);
    const classIds = matchedClasses.map((c) => c.id);
    reservationSearch = {
      OR: [{ detail: text }, { userId: { in: userIds } }, { performedById: { in: userIds } }],
    };
    auditSearch = {
      OR: [
        { detail: text },
        { action: text },
        { actorId: { in: userIds } },
        { targetUserId: { in: userIds } },
        { entityType: "User", entityId: { in: userIds } },
        { entityType: "Class", entityId: { in: classIds } },
        // Log cũ chỉ ghi "(userId: <id>)" trong detail (vd. bỏ giáo viên/học viên khỏi lớp).
        ...userIds.slice(0, 20).map((id) => ({ detail: { contains: `userId: ${id}` } })),
      ],
    };
  }

  const reservationWhere: Prisma.ReservationLogWhereInput = reservationSearch;
  // Nhóm "Gói học" chỉ đọc ReservationLog (xem PLAN_ACTIONS).
  const auditWhere: Prisma.AuditLogWhereInput | null =
    type === "plan" ? null : { AND: [auditTypeWhere(type), auditSearch] };

  const [reservationTotal, auditTotal] = await Promise.all([
    includeReservation ? prisma.reservationLog.count({ where: reservationWhere }) : Promise.resolve(0),
    auditWhere ? prisma.auditLog.count({ where: auditWhere }) : Promise.resolve(0),
  ]);
  const total = reservationTotal + auditTotal;
  const totalPages = Math.max(1, Math.ceil(total / LOG_PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);

  // Gộp 2 bảng theo thời gian: trang N cần tối đa N×50 dòng mới nhất của mỗi bảng.
  const take = currentPage * LOG_PAGE_SIZE;
  const [reservations, audits] = await Promise.all([
    includeReservation && reservationTotal > 0
      ? prisma.reservationLog.findMany({
          where: reservationWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take,
          select: {
            id: true,
            userId: true,
            performedById: true,
            action: true,
            detail: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
    auditWhere && auditTotal > 0
      ? prisma.auditLog.findMany({
          where: auditWhere,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            detail: true,
            actorRoles: true,
            targetUserId: true,
            before: true,
            after: true,
            ip: true,
            createdAt: true,
            actor: { select: { name: true, roles: true } },
            targetUser: { select: { name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  type Merged =
    | { kind: "r"; createdAt: Date; id: string; row: (typeof reservations)[number] }
    | { kind: "a"; createdAt: Date; id: string; row: (typeof audits)[number] };
  const merged: Merged[] = [
    ...reservations.map((row) => ({ kind: "r" as const, createdAt: row.createdAt, id: row.id, row })),
    ...audits.map((row) => ({ kind: "a" as const, createdAt: row.createdAt, id: row.id, row })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
    .slice((currentPage - 1) * LOG_PAGE_SIZE, currentPage * LOG_PAGE_SIZE);

  // Tra cứu cho riêng các dòng của trang này: người thao tác ReservationLog
  // (performedById không có quan hệ), tên người dùng / mã lớp đích của AuditLog.
  const actorIds = new Set<string>();
  const targetUserIds = new Set<string>();
  const targetClassIds = new Set<string>();
  const planRows: (typeof reservations)[number][] = [];
  for (const m of merged) {
    if (m.kind === "r") {
      actorIds.add(m.row.performedById);
      planRows.push(m.row);
      continue;
    }
    if (m.row.entityType === "User") targetUserIds.add(m.row.entityId);
    else if (m.row.entityType === "Class") targetClassIds.add(m.row.entityId);
    for (const match of m.row.detail?.matchAll(USER_ID_IN_DETAIL) ?? []) targetUserIds.add(match[1]);
  }
  const planTimes = planRows.map((r) => r.createdAt.getTime());
  const planStudentIds = [...new Set(planRows.map((r) => r.userId))];
  const [people, classes, planAudits] = await Promise.all([
    actorIds.size + targetUserIds.size > 0
      ? prisma.user.findMany({
          where: { id: { in: [...actorIds, ...targetUserIds] } },
          select: { id: true, name: true, roles: true },
        })
      : Promise.resolve([]),
    targetClassIds.size > 0
      ? prisma.class.findMany({ where: { id: { in: [...targetClassIds] } }, select: { id: true, code: true } })
      : Promise.resolve([]),
    planRows.length > 0
      ? prisma.auditLog.findMany({
          where: {
            action: { in: PLAN_ACTIONS },
            OR: [{ targetUserId: { in: planStudentIds } }, { entityType: "User", entityId: { in: planStudentIds } }],
            createdAt: {
              gte: new Date(Math.min(...planTimes) - PLAN_AUDIT_MATCH_MS),
              lte: new Date(Math.max(...planTimes) + PLAN_AUDIT_MATCH_MS),
            },
          },
          select: {
            id: true,
            action: true,
            actorId: true,
            entityType: true,
            entityId: true,
            targetUserId: true,
            actorRoles: true,
            before: true,
            after: true,
            ip: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
  ]);
  const personById = new Map(people.map((p) => [p.id, p]));
  const classCodeById = new Map(classes.map((c) => [c.id, c.code]));

  // Ghép mỗi dòng ReservationLog với dòng AuditLog cùng thao tác (cùng action,
  // học viên, người làm; gần thời điểm nhất, mỗi dòng AuditLog dùng 1 lần).
  const usedAudit = new Set<string>();
  const planAuditByReservation = new Map<string, (typeof planAudits)[number]>();
  for (const r of planRows) {
    let best: (typeof planAudits)[number] | undefined;
    let bestGap = Infinity;
    for (const a of planAudits) {
      if (usedAudit.has(a.id) || a.action !== r.action || a.actorId !== r.performedById) continue;
      const student = a.targetUserId ?? (a.entityType === "User" ? a.entityId : null);
      if (student !== r.userId) continue;
      const gap = Math.abs(a.createdAt.getTime() - r.createdAt.getTime());
      if (gap <= PLAN_AUDIT_MATCH_MS && gap < bestGap) {
        best = a;
        bestGap = gap;
      }
    }
    if (best) {
      usedAudit.add(best.id);
      planAuditByReservation.set(r.id, best);
    }
  }

  const entries: LogEntry[] = merged.map((m) => {
    if (m.kind === "r") {
      const actor = personById.get(m.row.performedById);
      const audit = planAuditByReservation.get(m.row.id);
      const role = actorRole(audit?.actorRoles, actor?.roles);
      return {
        key: `r_${m.id}`,
        createdAt: m.createdAt,
        // Giữ đúng định dạng trang cũ: "<tên học viên> — <detail>".
        content: `${m.row.user.name} — ${m.row.detail}`,
        category: "plan",
        actorName: actor?.name ?? "Tài khoản không còn tồn tại",
        actorRoleLabel: role.label,
        actorRoleIsCurrent: role.isCurrent,
        targetName: null,
        details: audit ? detailsOf(audit) : null,
      };
    }
    const detail = m.row.detail?.replace(USER_ID_IN_DETAIL, (whole, id: string) => {
      const name = personById.get(id)?.name;
      return name ? `(${name})` : whole;
    });
    const base = detail || AUDIT_ACTION_LABEL[m.row.action] || m.row.action;
    const target =
      m.row.entityType === "User"
        ? personById.get(m.row.entityId)?.name
        : m.row.entityType === "Class"
          ? classCodeById.get(m.row.entityId)
          : undefined;
    const content =
      target && !base.includes(target)
        ? `${m.row.entityType === "Class" ? `Lớp ${target}` : target} — ${base}`
        : base;
    const targetName = m.row.targetUser?.name ?? null;
    const role = actorRole(m.row.actorRoles, m.row.actor.roles);
    return {
      key: `a_${m.id}`,
      createdAt: m.createdAt,
      content,
      category: auditCategory(m.row.entityType),
      actorName: m.row.actor.name,
      actorRoleLabel: role.label,
      actorRoleIsCurrent: role.isCurrent,
      targetName: targetName && !content.includes(targetName) ? targetName : null,
      details: detailsOf(m.row),
    };
  });

  return { entries, total, page: currentPage, totalPages };
}
