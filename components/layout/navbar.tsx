import Link from "next/link";
import { auth } from "@/auth";
import { BrandLogo } from "@/components/layout/brand-logo";
import { NavSkillMenus } from "@/components/layout/nav-skill-menus";
import { NavListenMenu } from "@/components/layout/nav-listen-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import { hasAnyRole } from "@/lib/auth-helpers";
import { isStaff } from "@/lib/admin/permissions";

export async function Navbar() {
  const session = await auth();
  const user = session?.user;
  const avatarUrl = user ? await getUserAvatarUrl(user.id) : null;

  return (
    <header className="sticky top-0 z-40 bg-background/95 shadow-[0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur supports-backdrop-filter:bg-background/80 dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
      <div id="site-nav-row" className="mx-auto flex h-16 max-w-7xl items-center gap-1 px-4">
        {/* Mục "Admin" hiện cho mọi vai trò nhân viên — trang /admin tự giới hạn theo quyền. */}
        <MobileNav examPackage={user?.examPackage ?? "academic"} isAdmin={isStaff(user)} />
        <BrandLogo />

        <nav className="ml-2 hidden items-center gap-1.5 md:flex">
          <NavSkillMenus examPackage={user?.examPackage ?? "academic"} />
          <Button
            variant="ghost"
            className="group h-16 gap-1 px-3 text-[14px] leading-5 font-normal text-gray-500 dark:text-gray-400 hover:bg-transparent hover:text-gray-900 dark:hover:bg-transparent dark:hover:text-white"
            nativeButton={false}
            render={<Link href="/mocktest" />}
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
              <rect x="1" y="3" width="22" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
              <line x1="1" y1="9" x2="23" y2="9" stroke="currentColor" strokeWidth="1.1" />
              <circle cx="5" cy="6.5" r="0.9" fill="currentColor" />
              <circle cx="8" cy="6.5" r="0.9" fill="currentColor" />
              <circle cx="11" cy="6.5" r="0.9" fill="currentColor" />
              <path d="M4 13.2l1.2 1.2L7.5 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M4 17l3 3M7 17l-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <line x1="10" y1="18.5" x2="19" y2="18.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            <span className="relative inline-flex h-full items-center">
              Mocktest
              <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-[#d6474c] transition-all duration-300 group-hover:w-full" />
            </span>
          </Button>
          <NavListenMenu />
          <Button
            variant="ghost"
            className="group h-16 px-3 text-[14px] font-normal text-gray-500 dark:text-gray-400 hover:bg-transparent hover:text-gray-900 dark:hover:bg-transparent dark:hover:text-white"
            nativeButton={false}
            render={<Link href="/vocabulary" />}
          >
            <span className="relative inline-flex h-full items-center">
              Sổ từ vựng
              <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-[#d6474c] transition-all duration-300 group-hover:w-full" />
            </span>
          </Button>
          {hasAnyRole(user, ["ADMIN", "OPS", "ACADEMIC_LEAD", "TEACHER"]) && (
            <Button
              variant="ghost"
              className="group h-16 px-3 text-[14px] font-normal text-gray-500 dark:text-gray-400 hover:bg-transparent hover:text-gray-900 dark:hover:bg-transparent dark:hover:text-white"
              nativeButton={false}
              render={<Link href="/admin/classes" />}
            >
              <span className="relative inline-flex h-full items-center">
                Lớp học
                <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-[#d6474c] transition-all duration-300 group-hover:w-full" />
              </span>
            </Button>
          )}
          {isStaff(user) && (
            <Button
              variant="ghost"
              className="group h-16 px-3 text-[14px] font-normal text-gray-500 dark:text-gray-400 hover:bg-transparent hover:text-gray-900 dark:hover:bg-transparent dark:hover:text-white"
              nativeButton={false}
              render={<Link href="/admin" />}
            >
              <span className="relative inline-flex h-full items-center">
                Admin
                <span className="absolute bottom-0 left-0 h-[3px] w-0 bg-[#d6474c] transition-all duration-300 group-hover:w-full" />
              </span>
            </Button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user && (
            <UserMenu
              name={user.name ?? user.email ?? "Học viên"}
              avatarUrl={avatarUrl}
              examPackage={user.examPackage}
              expiresAt={user.expiresAt}
              reservationsLeft={user.reservationsLeft}
            />
          )}
        </div>
      </div>
    </header>
  );
}
