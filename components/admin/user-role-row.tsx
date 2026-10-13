"use client";

import { useFormStatus } from "react-dom";
import { PersonCell, Pill } from "@/components/admin/admin-ui";
import { updateUserRolesAction, toggleUserStatusAction } from "@/lib/actions/users";
import type { Role } from "@/lib/generated/prisma/enums";

const ALL_ROLES: Role[] = ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER", "STUDENT"];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  OPS: "Vận hành / CSKH",
  ACADEMIC_LEAD: "Trưởng học thuật",
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

function SubmitButton({ children, pendingText, className }: { children: string; pendingText: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/** `isSelf`: dòng của chính admin đang đăng nhập — không cho tự bỏ quyền ADMIN hay tự khoá. */
export function UserRoleRow({ user, isSelf = false }: { user: UserRoleRowData; isSelf?: boolean }) {
  const locked = user.status !== "ACTIVE";
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-3.5 last:border-b-0" style={{ borderColor: "var(--adm-line)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PersonCell
          name={user.name}
          email={user.email}
          extra={isSelf ? <span className="adm-tag">Bạn</span> : undefined}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {user.roles.map((r) => (
            <span key={r} className={r === "ADMIN" ? "adm-tag adm-tag-ac" : "adm-tag"}>
              {ROLE_LABELS[r]}
            </span>
          ))}
          <Pill tone={locked ? "bad" : "ok"}>{locked ? "Đã khoá" : "Hoạt động"}</Pill>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form action={updateUserRolesAction} className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <input type="hidden" name="userId" value={user.id} />
          <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
            <legend className="sr-only">Vai trò của {user.name}</legend>
            {ALL_ROLES.map((r) => {
              const lockedAdmin = isSelf && r === "ADMIN";
              return (
                <label
                  key={r}
                  className="flex items-center gap-1.5 text-[13px]"
                  style={{ color: "var(--adm-ink-2)" }}
                  title={lockedAdmin ? "Không thể tự bỏ quyền Admin của chính mình" : undefined}
                >
                  {/* Checkbox bị disabled không được gửi lên — gửi kèm input ẩn để giữ quyền ADMIN. */}
                  {lockedAdmin && <input type="hidden" name="role_ADMIN" value="on" />}
                  <input
                    type="checkbox"
                    name={lockedAdmin ? undefined : `role_${r}`}
                    defaultChecked={lockedAdmin || user.roles.includes(r)}
                    disabled={lockedAdmin}
                    className="size-4"
                    style={{ accentColor: "var(--adm-brand)" }}
                  />
                  {ROLE_LABELS[r]}
                </label>
              );
            })}
          </fieldset>
          <SubmitButton className="adm-btn adm-btn-sm" pendingText="Đang lưu...">
            Lưu vai trò
          </SubmitButton>
        </form>

        {!isSelf && (
          <form
            action={toggleUserStatusAction}
            onSubmit={(e) => {
              if (!locked && !confirm(`Khoá tài khoản ${user.name}? Người dùng sẽ bị đăng xuất và không đăng nhập được.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="userId" value={user.id} />
            <SubmitButton
              className={locked ? "adm-btn adm-btn-sm" : "adm-btn adm-btn-sm adm-btn-danger"}
              pendingText="Đang xử lý..."
            >
              {locked ? "Mở khoá" : "Khoá tài khoản"}
            </SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
