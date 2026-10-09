import Image from "next/image";
import Link from "next/link";
import { Bell, LogOut, Search } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";

export function SiteHeader({
  user,
}: {
  user: { name: string; avatarUrl: string | null } | null;
}) {
  return (
    <header className="sticky top-0 z-10 h-16 shrink-0" style={{ background: "var(--rail-bg)", boxShadow: "0 2px 8px rgba(0,0,0,.06)" }}>
      <div className="relative mx-auto flex h-16 max-w-[1280px] items-center gap-6 pl-4 sm:pl-8">
        <Link
          href="/"
          className="absolute left-1/2 flex shrink-0 -translate-x-1/2 items-center gap-2.5 text-[21px] font-bold sm:static sm:left-auto sm:translate-x-0"
          style={{ color: "var(--rail-charcoal)" }}
        >
          <Image src="/brand/pte-life-logo-light.png" alt="PTE LIFE" width={2040} height={694} className="h-10 w-auto" priority />
        </Link>

        <nav className="ml-auto hidden items-center gap-5 text-[16px] sm:flex" style={{ color: "var(--rail-ink-dim)" }} aria-label="Điều hướng chính">
          <button type="button" aria-label="Tìm kiếm" className="grid place-items-center p-1.5">
            <Search className="size-5" style={{ color: "var(--rail-charcoal)" }} />
          </button>
          <Link href="#" className="hover:text-[var(--rail-red)]">
            Hỗ trợ
          </Link>
          <Link href="#" className="hover:text-[var(--rail-red)]">
            Liên hệ
          </Link>
          <span className="h-5.5 w-px" style={{ background: "var(--rail-line)" }} aria-hidden="true" />
          <span className="flex items-center gap-1.5 text-[15px] font-medium">Tiếng Việt</span>
        </nav>

        {!user && (
          <Link
            href="/login"
            className="ml-4 flex h-16 shrink-0 items-center px-6 text-[16px] font-semibold tracking-[2px] text-white transition-colors sm:ml-0"
            style={{ background: "var(--rail-red)" }}
          >
            Đăng nhập
          </Link>
        )}
        {user && (
          <div className="ml-auto flex items-center gap-2.5 pr-4 font-semibold sm:ml-4 sm:pr-8">
            <button type="button" aria-label="Thông báo" className="relative grid place-items-center p-1.5">
              <Bell className="size-5" style={{ color: "var(--rail-charcoal)" }} />
            </button>
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- ảnh có thể từ Vercel Blob (domain động), tránh cấu hình remotePatterns
              <img src={user.avatarUrl} alt="" className="size-8.5 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid size-8.5 place-items-center rounded-full text-[14px] text-white" style={{ background: "var(--rail-ink)" }}>
                {user.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span className="hidden text-[16px] sm:inline">{user.name}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="ml-1 grid place-items-center rounded-md p-1.5 transition-colors hover:bg-[var(--rail-surface)] hover:text-[var(--rail-red)]"
                style={{ color: "var(--rail-charcoal)" }}
              >
                <LogOut className="size-5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
