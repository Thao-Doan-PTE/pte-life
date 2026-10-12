"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateUserRolesAction, toggleUserStatusAction } from "@/lib/actions/users";
import type { Role } from "@/lib/generated/prisma/enums";

const ALL_ROLES: Role[] = ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER", "STUDENT"];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  OPS: "Vận hành (OPS)",
  ACADEMIC_LEAD: "Học thuật",
  TEACHER: "Giáo viên",
  STUDENT: "Học viên",
};

export interface UserRoleRowData {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  status: "ACTIVE" | "INACTIVE";
}

/** `isSelf`: dòng của chính admin đang đăng nhập — không cho tự bỏ quyền ADMIN hay tự khoá. */
export function UserRoleRow({ user, isSelf = false }: { user: UserRoleRowData; isSelf?: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.roles.map((r) => (
            <Badge key={r} variant={r === "ADMIN" ? "default" : "outline"}>
              {ROLE_LABELS[r]}
            </Badge>
          ))}
          <Badge variant={user.status === "ACTIVE" ? "outline" : "destructive"}>
            {user.status === "ACTIVE" ? "Hoạt động" : "Đã khoá"}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-3">
        <form action={updateUserRolesAction} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="userId" value={user.id} />
          <div className="flex flex-wrap gap-3">
            {ALL_ROLES.map((r) => {
              const lockedAdmin = isSelf && r === "ADMIN";
              return (
                <label key={r} className="flex items-center gap-1.5 text-sm">
                  {/* Checkbox bị disabled không được gửi lên — gửi kèm input ẩn để giữ quyền ADMIN. */}
                  {lockedAdmin && <input type="hidden" name="role_ADMIN" value="on" />}
                  <input
                    type="checkbox"
                    name={lockedAdmin ? undefined : `role_${r}`}
                    defaultChecked={lockedAdmin || user.roles.includes(r)}
                    disabled={lockedAdmin}
                    className="size-4 accent-[var(--brand-accent,#e4222b)]"
                  />
                  {ROLE_LABELS[r]}
                </label>
              );
            })}
          </div>
          <Button type="submit" size="sm" variant="outline">
            Lưu role
          </Button>
        </form>

        {!isSelf && (
          <form action={toggleUserStatusAction}>
            <input type="hidden" name="userId" value={user.id} />
            <Button type="submit" size="sm" variant={user.status === "ACTIVE" ? "destructive" : "outline"}>
              {user.status === "ACTIVE" ? "Khoá tài khoản" : "Mở khoá"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
