import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasRole } from "@/lib/auth-helpers";

/** Đường dẫn cũ của giáo viên — giao bài nay nằm trong Admin LMS. Trang đích
 * tự kiểm tra quyền (requireAdminPage("manageAssignments")). */
export default async function GiaoBaiPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) redirect("/login?callbackUrl=/giao-bai");
  if (hasRole(user, "STUDENT")) redirect("/bai-tap");
  redirect("/admin/assignments");
}
