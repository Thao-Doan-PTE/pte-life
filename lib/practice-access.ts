import { auth } from "@/auth";
import { hasAnyRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/** Chuẩn hoá chuỗi người dùng gửi lên: ép kiểu, cắt khoảng trắng, giới hạn độ dài. */
export function clampText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

/** Dùng ở đầu server action luyện đề / chấm điểm. Server action gọi được trực
 * tiếp bằng HTTP, không qua layout, nên phải tự kiểm tra lại quyền ở đây:
 * phải đăng nhập, và nếu là học viên thì phải đang học 1 lớp (học viên mới
 * đăng ký chỉ được làm Test đầu vào). Tài khoản nội bộ luôn được dùng. */
export async function requirePracticeAccess() {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) throw new Error("Bạn cần đăng nhập.");
  if (hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"])) return user;

  const enrollment = await prisma.classEnrollment.findFirst({
    where: { studentId: user.id, status: "ACTIVE" },
    select: { id: true },
  });
  if (!enrollment) throw new Error("Tính năng này dành cho học viên đang học tại PTE-Life.");
  return user;
}
