"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";

export interface RailEntry {
  view: string;
  href: string;
  title: string;
  icon: ReactNode;
  group?: string;
  badge?: ReactNode;
  /** Mục bị khoá: hiển thị mờ + biểu tượng khoá, không bấm vào được. */
  locked?: boolean;
}

export interface RailBlock {
  href: string;
  label: string;
  description?: ReactNode;
  variant?: "dark";
}

const ArrowIcon = ({ className = "" }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" className={`ml-auto shrink-0 transition-transform group-hover:translate-x-1 ${className}`}>
    <path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function groupEntries(entries: RailEntry[]): { group: string | undefined; items: RailEntry[] }[] {
  const groups: { group: string | undefined; items: RailEntry[] }[] = [];
  for (const entry of entries) {
    let bucket = groups.find((g) => g.group === entry.group);
    if (!bucket) {
      bucket = { group: entry.group, items: [] };
      groups.push(bucket);
    }
    bucket.items.push(entry);
  }
  return groups;
}

export function RailNav({ entries, blocks }: { entries: RailEntry[]; blocks: RailBlock[] }) {
  const pathname = usePathname();
  const groups = groupEntries(entries);

  return (
    <>
      <nav className="flex flex-col gap-6" aria-label="Chọn khu vực">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.group && (
              <p className="m-0 mb-1.5 px-3 text-xs font-bold tracking-[0.08em] uppercase" style={{ color: "var(--rail-ink-dim)" }}>
                {g.group}
              </p>
            )}
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {g.items.map((e) => {
                const active = pathname === e.href;
                if (e.locked) {
                  return (
                    <li key={e.view}>
                      <span
                        aria-disabled="true"
                        title="Dành cho học viên PTE-Life đã được xếp lớp"
                        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-normal opacity-55 select-none"
                        style={{ color: "var(--rail-ink-dim)" }}
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center">{e.icon}</span>
                        <span className="min-w-0 flex-1 truncate">{e.title}</span>
                        <Lock className="ml-auto size-4 shrink-0" strokeWidth={1.8} />
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={e.view}>
                    <Link
                      href={e.href}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-normal transition-colors ${
                        active
                          ? "bg-[var(--rail-red-tint)] text-[var(--rail-red-text)]"
                          : "text-[var(--rail-ink)] hover:bg-[var(--rail-surface)]"
                      }`}
                    >
                      <span
                        className={`flex size-5 shrink-0 items-center justify-center ${
                          active ? "text-[var(--rail-red)]" : "text-[var(--rail-ink-dim)] group-hover:text-[var(--rail-charcoal)]"
                        }`}
                      >
                        {e.icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{e.title}</span>
                      {e.badge}
                      <ArrowIcon className={active ? "text-[var(--rail-red)]" : "text-[var(--rail-ink-dim)] group-hover:text-[var(--rail-charcoal)]"} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {blocks.map((b, i) =>
        b.variant === "dark" ? (
          <div key={i} className="flex flex-col gap-1.5 rounded-xl p-4" style={{ background: "#ffffff", color: "#0a68f9", border: "1.5px solid #0a68f9" }}>
            <Link href={b.href} className="inline-flex items-center gap-2 text-[15px] font-semibold hover:underline" style={{ textUnderlineOffset: "4px" }}>
              {b.label} <ArrowIcon />
            </Link>
            {b.description && (
              <p className="m-0 text-[14px] leading-[20px]" style={{ color: "var(--rail-ink-dim)" }}>
                {b.description}
              </p>
            )}
          </div>
        ) : (
          <div key={i} className="flex flex-col gap-2 pt-5" style={{ borderTop: "1px solid var(--rail-line)" }}>
            <Link href={b.href} className="inline-flex items-center gap-2.5 text-[16px] font-semibold hover:underline" style={{ color: "var(--rail-charcoal)", textUnderlineOffset: "4px" }}>
              {b.label} <ArrowIcon />
            </Link>
            {b.description && (
              <p className="m-0 text-[15px] leading-[22px]" style={{ color: "var(--rail-ink-dim)" }}>
                {b.description}
              </p>
            )}
          </div>
        )
      )}
    </>
  );
}
