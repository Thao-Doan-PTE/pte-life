import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth-helpers";
import { getStudentAccess, type StudentAccess } from "@/lib/student-access";

/** Học viên mới đăng ký (chưa được xếp lớp) chưa phải học viên PTE-Life: chỉ được
 * làm Test đầu vào. Gọi ở layout/page của khu vực luyện đề để chặn cả khi gõ thẳng
 * địa chỉ. Không ảnh hưởng khách (proxy lo đăng nhập) hay tài khoản nội bộ.
 * allowTuTrial: trang/phần thuộc bộ đề Tủ — cho cả người trong danh sách mời
 * dùng thử Tủ (chưa có lớp). Trả về mức quyền để trang kiểm tra tiếp
 * (null = khách hoặc tài khoản nội bộ không mang role STUDENT). */
export async function requireClassStudent(options: { allowTuTrial?: boolean } = {}): Promise<StudentAccess | null> {
  const session = await auth();
  const user = session?.user;
  if (!user || !hasRole(user, "STUDENT")) return null;
  const access = await getStudentAccess(user);
  if (access === "class") return access;
  if (access === "tu-trial" && options.allowTuTrial) return access;
  redirect(access === "tu-trial" ? "/de-tu" : "/test-dau-vao");
}
