import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = { label: string; href: string };

const DEFAULT_ITEMS: BreadcrumbItem[] = [{ label: "Trang chủ", href: "/" }];

export function DashboardBreadcrumb({
  current,
  items = DEFAULT_ITEMS,
  widthClass = "max-w-7xl",
}: {
  current: string;
  items?: BreadcrumbItem[];
  widthClass?: string;
}) {
  return (
    <div className="w-full">
      <div className={`mx-auto flex ${widthClass} items-center gap-1.5 px-4 pt-4 pb-2.5 text-[15px]`}>
        {items.map((item) => (
          <span key={item.href} className="flex items-center gap-1.5">
            <Link href={item.href} className="text-muted-foreground hover:text-[#e4222b]">
              {item.label}
            </Link>
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </span>
        ))}
        <span className="font-semibold text-foreground/70">{current}</span>
      </div>
    </div>
  );
}
