import { auth } from "@/auth";
import type { Role } from "@/lib/generated/prisma/enums";

type RoleBearer = { roles: Role[] } | null | undefined;

/** Kiểm tra 1 user có role cụ thể không — dùng chung cho mọi chỗ cần phân quyền
 * (mục 2.2 spec LMS: "viết một helper dùng chung, ví dụ can(user, action, resource)"). */
export function hasRole(user: RoleBearer, role: Role): boolean {
  return !!user?.roles?.includes(role);
}

export function hasAnyRole(user: RoleBearer, roles: Role[]): boolean {
  return roles.some((r) => hasRole(user, r));
}

export function isAdmin(user: RoleBearer): boolean {
  return hasRole(user, "ADMIN");
}

/** Dùng ở đầu trang admin/teacher (server component) hoặc trong server action:
 * lấy session hiện tại, throw nếu không có ít nhất 1 trong các role được phép. */
export async function requireRole(roles: Role[]) {
  const session = await auth();
  if (!session?.user?.id || !hasAnyRole(session.user, roles)) {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  return session.user;
}
