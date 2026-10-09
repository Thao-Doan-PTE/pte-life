"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { Mic, PenLine, BookOpen, Headphones, Play } from "lucide-react";
import {
  SKILL_LABELS,
  FREQUENCY_TIER_LABEL,
  type Skill,
  type FrequencyTier,
} from "@/lib/question-types";
import type { TypeProgress } from "@/lib/skill-progress-queries";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

const SKILL_ICONS: Record<Skill, ComponentType<{ className?: string }>> = {
  speaking: Mic,
  writing: PenLine,
  reading: BookOpen,
  listening: Headphones,
};

const SKILL_ICON_STYLES: Record<Skill, string> = {
  speaking: "bg-amber-500/15 text-amber-500",
  writing: "bg-violet-500/15 text-violet-500",
  reading: "bg-blue-500/15 text-blue-500",
  listening: "bg-red-500/15 text-red-500",
};

const SKILL_CARD_GRADIENT: Record<Skill, string> = {
  speaking: "bg-gradient-to-br from-amber-50 to-orange-100/70 dark:from-amber-950/30 dark:to-orange-950/10",
  writing: "bg-gradient-to-br from-violet-50 to-purple-100/70 dark:from-violet-950/30 dark:to-purple-950/10",
  reading: "bg-gradient-to-br from-blue-50 to-sky-100/70 dark:from-blue-950/30 dark:to-sky-950/10",
  listening: "bg-gradient-to-br from-red-50 to-rose-100/70 dark:from-red-950/30 dark:to-rose-950/10",
};

const SKILL_CARD_GRADIENT_ACTIVE: Record<Skill, string> = {
  speaking: "bg-gradient-to-br from-amber-100 to-orange-200/80 dark:from-amber-900/40 dark:to-orange-900/20",
  writing: "bg-gradient-to-br from-violet-100 to-purple-200/80 dark:from-violet-900/40 dark:to-purple-900/20",
  reading: "bg-gradient-to-br from-blue-100 to-sky-200/80 dark:from-blue-900/40 dark:to-sky-900/20",
  listening: "bg-gradient-to-br from-red-100 to-rose-200/80 dark:from-red-900/40 dark:to-rose-900/20",
};

const TIER_BADGE_STYLE: Record<FrequencyTier, string> = {
  SIEU: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  CAO: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  TB: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  THAP: "bg-muted text-muted-foreground",
};

const TIER_DOT_STYLE: Record<FrequencyTier, string> = {
  SIEU: "bg-red-500",
  CAO: "bg-red-500",
  TB: "bg-amber-500",
  THAP: "bg-muted-foreground",
};

type FilterKey = "all" | "not-started" | "in-progress" | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "not-started", label: "Chưa làm" },
  { key: "in-progress", label: "Đang làm" },
  { key: "done", label: "Hoàn thành" },
];

function statusOf(t: TypeProgress): FilterKey {
  if (t.practicedCount <= 0) return "not-started";
  if (t.totalCount > 0 && t.practicedCount >= t.totalCount) return "done";
  return "in-progress";
}

export function SkillProgressExplorer({ types }: { types: TypeProgress[] }) {
  const [selectedSkill, setSelectedSkill] = useState<Skill>("speaking");
  const [filter, setFilter] = useState<FilterKey>("all");

  const bySkill = useMemo(() => {
    const map = new Map<Skill, TypeProgress[]>();
    for (const skill of SKILLS) map.set(skill, []);
    for (const t of types) map.get(t.skill)?.push(t);
    return map;
  }, [types]);

  const skillSummaries = useMemo(
    () =>
      SKILLS.map((skill) => {
        const skillTypes = bySkill.get(skill) ?? [];
        const totalCount = skillTypes.reduce((sum, t) => sum + t.totalCount, 0);
        const practicedCount = skillTypes.reduce((sum, t) => sum + t.practicedCount, 0);
        const progressPct = totalCount > 0 ? Math.round((practicedCount / totalCount) * 100) : 0;
        return { skill, typesCount: skillTypes.length, totalCount, practicedCount, progressPct };
      }),
    [bySkill]
  );

  const currentTypes = bySkill.get(selectedSkill) ?? [];
  const filteredTypes = filter === "all" ? currentTypes : currentTypes.filter((t) => statusOf(t) === filter);

  return (
    <div>
      <h2 className="mb-3 text-[20px] font-semibold">Tiến độ theo kỹ năng</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {skillSummaries.map(({ skill, typesCount, totalCount, practicedCount, progressPct }) => {
          const Icon = SKILL_ICONS[skill];
          const active = skill === selectedSkill;
          return (
            <button
              key={skill}
              type="button"
              onClick={() => {
                setSelectedSkill(skill);
                setFilter("all");
              }}
              className={`flex flex-col gap-3 rounded-xl p-4 text-left shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                active ? SKILL_CARD_GRADIENT_ACTIVE[skill] : SKILL_CARD_GRADIENT[skill]
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex size-9 items-center justify-center rounded-lg ${SKILL_ICON_STYLES[skill]}`}>
                  <Icon className="size-4.5" />
                </div>
                <span className="text-[15px] font-bold text-muted-foreground">{progressPct}%</span>
              </div>
              <div>
                <p className="font-semibold">{SKILL_LABELS[skill]}</p>
                <p className="text-[13px] text-muted-foreground">
                  {typesCount} dạng bài · {practicedCount}/{totalCount} câu
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[17px] font-semibold">
          {SKILL_LABELS[selectedSkill]} <span className="text-muted-foreground">{filteredTypes.length}/{currentTypes.length} dạng bài</span>
        </p>
        <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-[15px] font-medium transition-colors ${
                filter === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500" /> Siêu trọng tâm / Trọng tâm cao
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" /> Trung bình
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground" /> Thấp
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-blue-500" /> Dạng mới 08/2025 · chấm AI + giám khảo
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTypes.map((t) => {
          const pct = t.totalCount > 0 ? Math.round((t.practicedCount / t.totalCount) * 100) : 0;
          return (
            <div key={t.id} className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-md">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[13px] font-bold">{t.code}</span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {t.isNewType && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                      Mới 08/2025
                    </span>
                  )}
                  {t.frequencyTier && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_BADGE_STYLE[t.frequencyTier]}`}>
                      {FREQUENCY_TIER_LABEL[t.frequencyTier]}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="mt-1 text-[15px] text-muted-foreground">{t.descriptionVi}.</p>
                {t.isNewType && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-blue-500" /> Nội dung được chấm bởi AI và giám khảo
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between text-[13px]">
                  <span>
                    Đã làm <span className="font-semibold text-foreground">{t.practicedCount}/{t.totalCount}</span> câu
                  </span>
                  <span className="font-semibold text-foreground">{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${t.frequencyTier ? TIER_DOT_STYLE[t.frequencyTier] : "bg-primary"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>

              <Link
                href={`/practice/${t.skill}/${t.id}`}
                className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[15px] font-bold text-primary-foreground"
              >
                {t.practicedCount > 0 ? "Luyện tiếp" : "Bắt đầu luyện"} <Play className="size-3.5" fill="currentColor" />
              </Link>
            </div>
          );
        })}
        {filteredTypes.length === 0 && (
          <p className="col-span-full py-6 text-center text-[15px] text-muted-foreground">Không có dạng bài phù hợp bộ lọc.</p>
        )}
      </div>
    </div>
  );
}
