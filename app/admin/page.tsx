import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { AdminUserRow } from "@/components/admin/admin-user-row";
import { getAllUsersForAdmin, getRecentReservationLogs } from "@/lib/actions/admin";
import { formatRelativeOrDate } from "@/lib/format";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const [users, logs] = await Promise.all([
    getAllUsersForAdmin(),
    getRecentReservationLogs(),
  ]);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-5 py-6 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Quản lý gói học & bảo lưu</h1>
            <p className="text-sm text-muted-foreground">
              Trang nội bộ cho đội vận hành/CSKH PTE-Life.
            </p>
          </div>
          <Link
            href="/admin/questions"
            className="rounded-lg border px-3 py-1.5 text-sm font-medium text-primary hover:bg-muted"
          >
            Quản lý ngân hàng đề →
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {users.map((u) => (
            <AdminUserRow
              key={u.id}
              user={{
                id: u.id,
                name: u.name,
                email: u.email,
                examPackage: u.examPackage,
                expiresAt: u.expiresAt.toISOString(),
                reservationsLeft: u.reservationsLeft,
              }}
            />
          ))}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Nhật ký thao tác gần đây</h2>
          <div className="flex flex-col divide-y rounded-xl border bg-card">
            {logs.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Chưa có thao tác nào.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex flex-col gap-0.5 px-4 py-3 text-sm">
                  <p>
                    <span className="font-medium">{log.user.name}</span> —{" "}
                    {log.detail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeOrDate(log.createdAt.toISOString())}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
