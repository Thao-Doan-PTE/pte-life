"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Mic, PenLine, BookOpen, Headphones } from "lucide-react";
import { QUESTION_TYPES, SKILL_LABELS, type Skill, type ExamPackage } from "@/lib/question-types";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

const SKILL_ICONS: Record<Skill, typeof Mic> = {
  speaking: Mic,
  writing: PenLine,
  reading: BookOpen,
  listening: Headphones,
};

/** Màu nền chip theo kỹ năng — đồng bộ với SKILL_ACCENT_COLOR (lib/question-types.ts)
 * và bảng màu 4 thẻ kỹ năng ở start-practice-grid.tsx (amber/violet/blue/red). */
const SKILL_CHIP_BG: Record<Skill, string> = {
  speaking: "bg-amber-500 hover:bg-amber-600",
  writing: "bg-violet-500 hover:bg-violet-600",
  reading: "bg-blue-500 hover:bg-blue-600",
  listening: "bg-[#d6474c] hover:bg-[#c53e43]",
};

export function PracticeQuickLaunch({ examPackage }: { examPackage: ExamPackage }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const types = useMemo(() => QUESTION_TYPES.filter((t) => t.availableIn.includes(examPackage)), [examPackage]);

  const q = query.trim().toLowerCase();
  const matches = q ? types.filter((t) => t.code.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)) : types;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (matches.length === 1) {
      router.push(`/practice/${matches[0].skill}/${matches[0].id}`);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl min-w-0">
          <h2 className="text-2xl font-bold">Chọn kỹ năng luyện tập</h2>
          <p className="mt-2 text-[15px] font-normal text-foreground/80">
            Hệ thống luyện đề PTE-Life cung cấp kho đề thi PTE
            <br />
            kèm đáp án giải thích chi tiết.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="relative shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gõ viết tắt: WFD, RA, FIB..."
            className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-[15px] outline-none focus:ring-2 focus:ring-primary/30 sm:w-72"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            /
          </kbd>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-xl bg-card p-4 shadow-md">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] font-normal text-muted-foreground">{types.length} dạng bài · bấm để vào luyện</p>
            <p className="text-[13px] text-muted-foreground">
              <span className="mr-1 inline-block size-2.5 rounded-sm border-2 border-blue-500 align-[-1px]" /> Viền
              xanh: dạng mới 08/2025
            </p>
          </div>
          {SKILLS.map((skill) => {
            const skillTypes = matches.filter((t) => t.skill === skill);
            if (skillTypes.length === 0) return null;
            const Icon = SKILL_ICONS[skill];
            return (
              <div
                key={skill}
                className="flex flex-col gap-3 border-b py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6"
              >
                <p className="flex shrink-0 items-center gap-2 pt-1 text-[20px] font-bold text-foreground sm:w-40">
                  <Icon className="size-5 shrink-0" />
                  <span>{SKILL_LABELS[skill]}</span>
                </p>
                <div className="flex flex-1 flex-wrap gap-3">
                  {skillTypes.map((t) => (
                    <Link
                      key={t.id}
                      href={`/practice/${t.skill}/${t.id}`}
                      className={`relative flex w-16 -translate-y-0 flex-col items-center justify-center gap-0 rounded-lg px-1 py-1.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${SKILL_CHIP_BG[skill]} ${
                        t.isNewType ? "ring-2 ring-blue-500 ring-offset-1" : ""
                      }`}
                    >
                      {t.isNewType && (
                        <span className="absolute -top-2 -right-2 rounded-full bg-blue-600 px-1 py-0.5 text-xs font-bold text-white">
                          Mới
                        </span>
                      )}
                      <span className="text-[13px] font-bold whitespace-nowrap text-white">{t.code}</span>
                      {t.overallWeightPct != null && (
                        <span className="text-xs font-semibold text-white/85">{t.overallWeightPct}%</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
          {matches.length === 0 && <p className="text-[15px] text-muted-foreground">Không tìm thấy dạng bài phù hợp.</p>}
        </div>
      </div>
    </div>
  );
}
