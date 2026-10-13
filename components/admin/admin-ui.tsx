import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AdminMenuButton } from "@/components/admin/shell/admin-shell";
import { PACKAGE_LABEL } from "@/lib/admin/student-status";

/** Bộ thành phần giao diện dùng chung cho mọi trang Admin LMS — luôn dùng các
 * thành phần này (và các class .adm-* trong app/globals.css) để giữ giao diện
 * thống nhất giữa các trang. */

/** Thanh tiêu đề dính trên cùng của mỗi trang: nút mở menu (màn hẹp) + tiêu đề + mô tả + nút hành động. */
export function AdminPageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-2.5 md:px-6 md:py-3"
      style={{ background: "var(--adm-bg)", borderColor: "var(--adm-line)" }}
    >
      <AdminMenuButton />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[18px] font-bold text-balance">{title}</h1>
        {sub && (
          <p className="truncate text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {sub}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Vùng nội dung bên dưới thanh tiêu đề. */
export function AdminContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-5 px-4 pt-4 pb-10 md:px-6 md:pt-5 md:pb-12", className)}>{children}</div>;
}

export function Panel({
  title,
  meta,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("adm-panel min-w-0", className)}>
      {(title || actions) && (
        <div className="adm-panel-head">
          <div className="flex min-w-0 items-baseline gap-2">
            {title && <h2>{title}</h2>}
            {meta && (
              <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                {meta}
              </span>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Kpi({
  label,
  value,
  hint,
  href,
  alert = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  /** Tô đỏ con số khi > 0 (việc tồn cần xử lý). */
  alert?: boolean;
}) {
  const body = (
    <>
      <span className="text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
        {label}
      </span>
      <span className="adm-num text-[28px] leading-[1.1] font-semibold" style={alert ? { color: "var(--adm-brand-text)" } : undefined}>
        {value}
      </span>
      {hint && (
        <span className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {hint}
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} className="adm-kpi">
      {body}
    </Link>
  ) : (
    <div className="adm-kpi">{body}</div>
  );
}

export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "plum" | "mute"; children: ReactNode }) {
  return <span className={`adm-pill adm-pill-${tone}`}>{children}</span>;
}

export function PackageTag({ pkg }: { pkg: string }) {
  return <span className={cn("adm-tag", pkg === "academic" && "adm-tag-ac")}>{PACKAGE_LABEL[pkg] ?? pkg}</span>;
}

export function ProgressBar({
  value,
  red = false,
  className,
  label,
}: {
  value: number;
  red?: boolean;
  className?: string;
  /** Tên đọc cho trình đọc màn hình, vd "Tỷ lệ nộp bài lớp K12". */
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("adm-bar", red && "adm-bar-red", className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function InitialsAvatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span className="adm-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}

/** Ô "người": avatar chữ cái + tên đậm + email nhỏ. */
export function PersonCell({ name, email, extra }: { name: string; email?: string | null; extra?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <InitialsAvatar name={name} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold">{name}</span>
          {extra}
        </div>
        {email && (
          <div className="truncate text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {email}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-[13.5px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

/** Nhóm lọc dạng segmented bằng link (giữ trạng thái lọc trên URL). */
export function SegLinks({ items }: { items: { label: string; href: string; active: boolean }[] }) {
  return (
    <nav className="adm-seg">
      {items.map((it) => (
        <Link key={it.href} href={it.href} aria-current={it.active ? "true" : undefined} scroll={false}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

export function MutedText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[12.5px]", className)} style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </span>
  );
}
