"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SKILL_LABELS, type Skill } from "@/lib/question-types";
import { formatRelativeOrDate, scoreColorClass } from "@/lib/format";

export interface HistoryItem {
  id: string;
  skill: Skill;
  typeName: string;
  questionCode: string;
  excerpt: string;
  scorePct: number;
  pteScore: number;
  createdAt: string;
}

const TABS: { value: "all" | Skill; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "speaking", label: "Speaking" },
  { value: "writing", label: "Writing" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
];

const SKILL_BADGE_CLASS: Record<Skill, string> = {
  speaking: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  writing: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  reading: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  listening: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function HistoryList({ items }: { items: HistoryItem[] }) {
  const [tab, setTab] = useState<"all" | Skill>("all");
  const filtered = tab === "all" ? items : items.filter((i) => i.skill === tab);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Chưa có lượt luyện tập nào.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-xl border bg-card">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/history/${item.id}`}
              className="flex flex-col gap-2 px-4 py-3 text-sm transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Badge
                  variant="secondary"
                  className={cn("shrink-0", SKILL_BADGE_CLASS[item.skill])}
                >
                  {SKILL_LABELS[item.skill]}
                </Badge>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {item.typeName}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {item.questionCode}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.excerpt}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3 pl-11 sm:pl-0">
                <span className={cn("font-semibold", scoreColorClass(item.scorePct))}>
                  {item.scorePct}%
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeOrDate(item.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
