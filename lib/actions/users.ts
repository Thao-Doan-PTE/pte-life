"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import type { Role } from "@/lib/generated/prisma/enums";

const ALL_ROLES: Role[] = ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER", "STUDENT"];

/** A2 — Người dùng: toàn bộ user, không lọc theo role như getAllUsersForAdmin
 * (chỉ dùng cho trang gói học/bảo lưu, giữ nguyên không đụng tới). */
export async function getAllUsersForRoleManagement() {
  await requireRole(["ADMIN"]);
  return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
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

  await prisma.user.update({ where: { id: userId }, data: { roles } });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "update_roles",
      entityType: "User",
      entityId: userId,
      detail: `Đổi role thành: ${roles.join(", ")}`,
    },
  });
  revalidatePath("/admin/users");
}

export async function toggleUserStatusAction(formData: FormData) {
  const admin = await requireRole(["ADMIN"]);
  const userId = formData.get("userId") as string;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  await prisma.user.update({ where: { id: userId }, data: { status: nextStatus } });
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "toggle_status",
      entityType: "User",
      entityId: userId,
      detail: `Đổi trạng thái thành: ${nextStatus}`,
    },
  });
  revalidatePath("/admin/users");
}
