import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavbarAvatarUpload } from "@/components/layout/navbar-avatar-upload";
import { daysUntil, formatDate } from "@/lib/format";
import { logoutAction } from "@/lib/actions/auth";
import type { ExamPackage } from "@/lib/question-types";

export function UserMenu({
  name,
  avatarUrl,
  examPackage,
  expiresAt,
  reservationsLeft,
}: {
  name: string;
  avatarUrl?: string | null;
  examPackage: ExamPackage;
  expiresAt: string;
  reservationsLeft: number;
}) {
  const packageLabel = examPackage === "academic" ? "PTE Academic" : "PTE Core";
  const remainingDays = daysUntil(expiresAt);

  return (
    <div className="flex items-center gap-1">
      <NavbarAvatarUpload name={name} avatarUrl={avatarUrl ?? null} />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<button type="button" className="flex items-center gap-3 rounded-md p-1" />}
        >
          <div className="hidden md:flex flex-col items-start leading-tight">
            <span className="text-sm font-medium">{name}</span>
            <Badge
              variant={examPackage === "academic" ? "default" : "outline"}
              className="w-fit text-[10px] px-1.5 py-0"
            >
              {packageLabel}
            </Badge>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{name}</DropdownMenuLabel>
            <div className="px-1.5 pb-1.5 text-xs text-muted-foreground">
              Hết hạn: còn {remainingDays} ngày ({formatDate(expiresAt)})
            </div>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem disabled title="Sắp ra mắt">
              Bảo lưu ({reservationsLeft} lần)
            </DropdownMenuItem>
            <DropdownMenuItem disabled title="Sắp ra mắt">
              Đổi mật khẩu
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <form action={logoutAction}>
        <Button
          type="submit"
          variant="ghost"
          size="icon"
          aria-label="Đăng xuất"
        >
          <LogOut className="size-4" />
        </Button>
      </form>
    </div>
  );
}
