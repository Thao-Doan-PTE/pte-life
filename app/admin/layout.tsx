import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminShell, type AdminNavGroup } from "@/components/admin/shell/admin-shell";
import { can, getScopedClassIdsFor, hasUnscopedAccess, isStaff, staffRoleLabel, type Capability } from "@/lib/admin/permissions";
import { countExpiringStudents, countPendingGrading, countUnplacedEntryTests } from "@/lib/admin/nav-queries";

/** Khung chung của Admin LMS. Chỉ để hiển thị menu theo quyền — mỗi trang và
 * mỗi server action vẫn tự kiểm tra quyền (Next.js không chạy lại layout khi
 * chuyển trang phía trình duyệt nên layout không phải lớp bảo vệ). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) redirect("/login?callbackUrl=/admin");
  if (!isStaff(user)) redirect("/");

  const [expiring, unplaced, pendingGrading] = await Promise.all([
    can(user, "viewStudents") ? countExpiringStudents() : Promise.resolve(0),
    // Người chưa xếp lớp không thuộc lớp nào → chỉ người xem test đầu vào của mọi lớp mới thấy số này.
    hasUnscopedAccess(user, "viewEntryTests") ? countUnplacedEntryTests() : Promise.resolve(0),
    // Phạm vi theo quyền chấm bài (OPS + TEACHER chỉ đếm bài lớp mình phụ trách).
    can(user, "gradeSubmissions") ? getScopedClassIdsFor(user, "gradeSubmissions").then(countPendingGrading) : Promise.resolve(0),
  ]);

  const item = (cap: Capability, entry: AdminNavGroup["items"][number]) => (can(user, cap) ? [entry] : []);
  const groups: AdminNavGroup[] = [
    {
      label: "Vận hành",
      items: [
        ...item("viewOverview", { href: "/admin", label: "Tổng quan", icon: "overview" }),
        ...item("viewStudents", { href: "/admin/students", label: "Học viên & gói học", icon: "students", badge: expiring }),
        ...item("viewEntryTests", { href: "/admin/entry-tests", label: "Test đầu vào", icon: "entryTests", badge: unplaced }),
      ],
    },
    {
      label: "Đào tạo",
      items: [
        ...item("viewClasses", { href: "/admin/classes", label: "Lớp học", icon: "classes" }),
        ...item("manageAssignments", { href: "/admin/assignments", label: "Giao bài tập", icon: "assignments" }),
        ...item("gradeSubmissions", { href: "/admin/grading", label: "Chấm bài", icon: "grading", badge: pendingGrading }),
        ...item("viewTeachers", { href: "/admin/teachers", label: "Giáo viên", icon: "teachers" }),
      ],
    },
    {
      label: "Nội dung",
      items: [
        ...item("viewQuestionBank", { href: "/admin/questions", label: "Ngân hàng đề", icon: "questionBank" }),
        ...item("viewLogs", { href: "/admin/logs", label: "Nhật ký thao tác", icon: "logs" }),
      ],
    },
    {
      label: "Hệ thống",
      items: [...item("manageUsers", { href: "/admin/users", label: "Người dùng & phân quyền", icon: "users" })],
    },
  ].filter((g) => g.items.length > 0);

  return (
    <AdminShell groups={groups} userName={user.name ?? user.email ?? ""} roleLabel={staffRoleLabel(user)}>
      {children}
    </AdminShell>
  );
}
