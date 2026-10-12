import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Tìm user theo email, không phân biệt hoa thường. Thử khớp chính xác trước;
 * nếu không có thì so khớp không phân biệt hoa thường cho các tài khoản cũ lưu
 * email có chữ hoa. Prisma dịch phép so khớp này thành ILIKE nên phải escape
 * `%`/`_` — nếu không "a_b@x.com" sẽ khớp cả "axb@x.com". */
export async function findUserByEmail<S extends Prisma.UserSelect>(email: string, select: S) {
  const normalized = normalizeEmail(email);
  const exact = await prisma.user.findUnique({ where: { email: normalized }, select });
  if (exact) return exact;
  const escaped = normalized.replace(/[\\%_]/g, (c) => `\\${c}`);
  return prisma.user.findFirst({
    where: { email: { equals: escaped, mode: "insensitive" } },
    orderBy: { createdAt: "asc" },
    select,
  });
}
