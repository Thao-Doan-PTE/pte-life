"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  ClipboardList,
  FileClock,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  PenLine,
  ScrollText,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/layout/theme-toggle";

/** Tên icon (truyền được từ server component sang client). */
export const ADMIN_NAV_ICONS = {
  overview: LayoutDashboard,
  students: Users,
  entryTests: ClipboardList,
  classes: GraduationCap,
  assignments: PenLine,
  grading: BookOpenCheck,
  teachers: UserCog,
  questionBank: Library,
  logs: ScrollText,
  users: FileClock,
} satisfies Record<string, LucideIcon>;

export interface AdminNavItem {
  href: string;
  label: string;
  icon: keyof typeof ADMIN_NAV_ICONS;
  /** Số việc tồn (badge đỏ) — chỉ hiện khi > 0. */
  badge?: number;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const MenuContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

/** Nút mở menu điều hướng trên màn hình hẹp (< 860px). */
export function AdminMenuButton() {
  const { open, setOpen } = useContext(MenuContext);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label="Mở menu quản trị"
      aria-expanded={open}
      aria-controls="admin-sidebar"
      className="adm-btn adm-btn-sm min-[860px]:hidden"
    >
      <Menu className="size-4" />
    </button>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({
  groups,
  userName,
  roleLabel,
  onNavigate,
}: {
  groups: AdminNavGroup[];
  userName: string;
  roleLabel: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-5 px-3.5 py-5">
      <Link href="/admin" onClick={onNavigate} className="flex items-center gap-2.5 px-1.5">
        <Image src="/brand/pte-life-logo-dark.png" alt="PTE-Life" width={2040} height={694} className="h-7 w-auto" priority />
        <span className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "var(--adm-side-ink-2)" }}>
          Admin
        </span>
      </Link>

      <nav aria-label="Điều hướng quản trị" className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-2.5 pb-1 text-[10.5px] font-semibold tracking-[0.09em] uppercase" style={{ color: "var(--adm-side-ink-2)" }}>
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = ADMIN_NAV_ICONS[item.icon];
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13.5px] font-medium transition-colors hover:bg-[var(--adm-side-2)] hover:text-[var(--adm-side-ink)]"
                  style={
                    active
                      ? { background: "var(--adm-side-2)", color: "var(--adm-side-ink)", boxShadow: "inset 3px 0 0 var(--adm-brand)" }
                      : { color: "var(--adm-side-ink-2)" }
                  }
                >
                  <Icon className="size-[17px] shrink-0" strokeWidth={1.8} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span
                      className="adm-num min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold"
                      style={{ background: "var(--adm-brand)", color: "var(--adm-on-brand)" }}
                      aria-label={`${item.badge} việc cần xử lý`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t pt-4" style={{ borderColor: "var(--adm-side-2)" }}>
        <div className="flex items-center justify-between gap-2 px-1.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold" style={{ color: "var(--adm-side-ink)" }}>
              {userName}
            </p>
            <p className="truncate text-[11.5px]" style={{ color: "var(--adm-side-ink-2)" }}>
              {roleLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1" style={{ color: "var(--adm-side-ink-2)" }}>
            <ThemeToggle />
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Đăng xuất"
                className="flex size-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--adm-side-2)] hover:text-[var(--adm-side-ink)]"
              >
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
        <Link
          href="/"
          onClick={onNavigate}
          className="px-1.5 text-[12px] underline-offset-2 hover:underline"
          style={{ color: "var(--adm-side-ink-2)" }}
        >
          ← Về trang học viên
        </Link>
      </div>
    </div>
  );
}

/** Khung Admin LMS: sidebar than ấm cố định bên trái (≥ 860px), trượt ra từ
 * trái trên màn hình hẹp; nội dung trang nằm bên phải. */
export function AdminShell({
  groups,
  userName,
  roleLabel,
  children,
}: {
  groups: AdminNavGroup[];
  userName: string;
  roleLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Đóng menu trượt khi đổi trang hoặc bấm Esc.
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <MenuContext.Provider value={{ open, setOpen }}>
      <div className="admin-theme min-h-svh min-[860px]:grid min-[860px]:grid-cols-[248px_minmax(0,1fr)]">
        <aside
          id="admin-sidebar"
          className={`fixed inset-y-0 left-0 z-30 w-[260px] overflow-y-auto transition-transform duration-200 min-[860px]:sticky min-[860px]:top-0 min-[860px]:z-auto min-[860px]:h-svh min-[860px]:w-auto min-[860px]:translate-x-0 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ background: "var(--adm-side)" }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Đóng menu"
            className="absolute top-4 right-3 flex size-8 items-center justify-center rounded-md min-[860px]:hidden"
            style={{ color: "var(--adm-side-ink-2)" }}
          >
            <X className="size-4" />
          </button>
          <SidebarContent groups={groups} userName={userName} roleLabel={roleLabel} onNavigate={() => setOpen(false)} />
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-20 min-[860px]:hidden"
            style={{ background: "var(--adm-scrim)" }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="min-w-0">{children}</main>
      </div>
    </MenuContext.Provider>
  );
}
