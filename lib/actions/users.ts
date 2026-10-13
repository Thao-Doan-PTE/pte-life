"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { writeAuditLog } from "@/lib/admin/audit";
import type { Role } from "@/lib/generated/prisma/enums";

const ALL_ROLES: Role[] = ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER", "STUDENT"];

/** A2 — Người dùng: toàn bộ user, không lọc theo role như getAllUsersForAdmin
 * (chỉ dùng cho trang gói học/bảo lưu, giữ nguyên không đụng tới). */
export async function getAllUsersForRoleManagement() {
  await requireRole(["ADMIN"]);
  // File "use server" — hàm export gọi được trực tiếp qua HTTP, nên không bao giờ trả mã băm mật khẩu.
  return prisma.user.findMany({ orderBy: { createdAt: "desc" }, omit: { passwordHash: true } });
}

export async function getUsersByRole(role: Role) {
  await requireRole(["ADMIN", "OPS", "ACADEMIC_LEAD"]);
  return prisma.user.findMany({
    where: { roles: { has: role } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
}

export async function updateUserRolesAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const userId = formData.get("userId") as string;
  const roles = ALL_ROLES.filter((r) => formData.get(`role_${r}`) === "on");
  if (roles.length === 0) {
    throw new Error("Mỗi user phải có ít nhất 1 role.");
  }
  // Không cho admin tự bỏ quyền ADMIN của chính mình (tránh tự khoá khỏi trang quản trị).
  if (userId === admin.id && !roles.includes("ADMIN")) {
    throw new Error("Bạn không thể tự bỏ quyền ADMIN của chính mình.");
  }

  // Đổi role + ghi nhật ký trong cùng 1 transaction: ghi log lỗi thì không đổi role
  // (không có thay đổi quyền nào lọt khỏi nhật ký). before/after để biết role nào bị bỏ.
  await prisma.$transaction(async (tx) => {
    const prev = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { roles: true } });
    await tx.user.update({ where: { id: userId }, data: { roles } });
    await writeAuditLog(
      {
        actor: admin,
        action: "update_roles",
        entityType: "User",
        entityId: userId,
        targetUserId: userId,
        detail: `Đổi role thành: ${roles.join(", ")}`,
        before: { roles: prev.roles },
        after: { roles },
      },
      tx
    );
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/logs");
}

export async function toggleUserStatusAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const userId = formData.get("userId") as string;
  if (userId === admin.id) {
    throw new Error("Bạn không thể tự khoá tài khoản của chính mình.");
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { status: true } });
  const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  // So-sánh-rồi-ghi: chỉ đổi khi trạng thái vẫn đúng như lúc đọc, và chỉ ghi log khi
  // thật sự đổi được 1 dòng — 2 lần bấm cùng lúc không lật 2 lần / ghi 2 log trái ngược.
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: { id: userId, status: user.status },
      data: { status: nextStatus },
    });
    if (count !== 1) return;
    await writeAuditLog(
      {
        actor: admin,
        action: "toggle_status",
        entityType: "User",
        entityId: userId,
        targetUserId: userId,
        detail: `Đổi trạng thái thành: ${nextStatus}`,
        before: { status: user.status },
        after: { status: nextStatus },
      },
      tx
    );
  });
  revalidatePath("/admin/users");
  revalidatePath("/admin/logs");
}
