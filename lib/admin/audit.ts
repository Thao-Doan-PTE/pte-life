import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { Role } from "@/lib/generated/prisma/enums";
import { getIpFromHeaders } from "@/lib/rate-limit";

/** Ghi 1 dòng nhật ký thao tác đầy đủ (HANDOFF.md mục 4.9): người làm + vai trò
 * lúc đó, người bị tác động, dữ liệu trước/sau, IP, trình duyệt.
 * Bảng ReservationLog (đổi gói/gia hạn/bảo lưu) vẫn ghi y như cũ — dòng này ghi THÊM. */
export async function writeAuditLog(
  entry: {
    actor: { id: string; roles: Role[] };
    action: string;
    entityType: string;
    entityId: string;
    detail?: string;
    targetUserId?: string | null;
    before?: Prisma.InputJsonValue;
    after?: Prisma.InputJsonValue;
  },
  tx: Prisma.TransactionClient = prisma
): Promise<void> {
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip = getIpFromHeaders(h);
    userAgent = h.get("user-agent")?.slice(0, 300) ?? null;
  } catch {
    // Gọi ngoài request (script) — bỏ qua IP/trình duyệt.
  }
  await tx.auditLog.create({
    data: {
      actorId: entry.actor.id,
      actorRoles: entry.actor.roles,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      detail: entry.detail,
      targetUserId: entry.targetUserId ?? null,
      before: entry.before,
      after: entry.after,
      ip,
      userAgent,
    },
  });
}
