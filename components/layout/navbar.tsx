import Link from "next/link";
import { auth } from "@/auth";
import { BrandLogo } from "@/components/layout/brand-logo";
import { NavSkillDropdown } from "@/components/layout/nav-skill-dropdown";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { getUserAvatarUrl } from "@/lib/dashboard-queries";
import type { Skill } from "@/lib/question-types";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export async function Navbar() {
  const session = await auth();
  const user = session?.user;
  const avatarUrl = user ? await getUserAvatarUrl(user.id) : null;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4">
        <MobileNav />
        <BrandLogo />

        <nav className="ml-2 hidden items-center gap-0.5 md:flex">
          {SKILLS.map((skill) => (
            <NavSkillDropdown key={skill} skill={skill} />
          ))}
          <Button
            variant="ghost"
            className="px-3"
            nativeButton={false}
            render={<Link href="/history" />}
          >
            Lịch sử
          </Button>
          {user?.role === "admin" && (
            <Button
              variant="ghost"
              className="px-3"
              nativeButton={false}
              render={<Link href="/admin" />}
            >
              Admin
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
