import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth-helpers";

/** Đường dẫn cũ của giáo viên — chấm bài nay nằm trong Admin LMS. Trang đích
 * tự kiểm tra quyền (requireAdminPage("gradeSubmissions")). */
export default async function BaiChoChamPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/bai-cho-cham");
  if (hasRole(user, "STUDENT")) redirect("/bai-tap");
  redirect("/admin/grading");
}
