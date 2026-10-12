import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { UserRoleRow } from "@/components/admin/user-role-row";
import { getAllUsersForRoleManagement } from "@/lib/actions/users";
import { isAdmin } from "@/lib/auth-helpers";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user || !isAdmin(session.user)) {
    redirect("/");
  }

  const users = await getAllUsersForRoleManagement();

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Người dùng</h1>
            <p className="text-sm text-muted-foreground">
              Gán role và khoá/mở khoá tài khoản. Một user có thể mang nhiều role.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/classes"
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted"
            >
              Lớp học →
            </Link>
            <Link
              href="/admin"
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted"
            >
              Gói học & bảo lưu →
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {users.map((u) => (
            <UserRoleRow
              key={u.id}
              user={{ id: u.id, name: u.name, email: u.email, roles: u.roles, status: u.status }}
              isSelf={u.id === session.user.id}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
