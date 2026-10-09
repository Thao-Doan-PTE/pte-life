import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth-helpers";
import { getActiveClassInfo } from "@/lib/student-overview-queries";

/** Học viên mới đăng ký (chưa được xếp lớp) chưa phải học viên PTE-Life: chỉ được
 * làm Test đầu vào. Gọi ở layout/page của khu vực luyện đề để chặn cả khi gõ thẳng
 * địa chỉ. Không ảnh hưởng khách (proxy lo đăng nhập) hay tài khoản nội bộ. */
export async function requireClassStudent() {
  const session = await auth();
  const user = session?.user;
  if (!user || !hasRole(user, "STUDENT")) return;
  const classInfo = await getActiveClassInfo(user.id);
  if (!classInfo) redirect("/test-dau-vao");
}
