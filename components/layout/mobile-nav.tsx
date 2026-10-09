"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Headphones, Menu, Mic, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LISTEN_PRACTICE_LINKS } from "@/components/layout/nav-listen-menu";
import {
  getQuestionTypesBySkill,
  SKILL_LABELS,
  type ExamPackage,
  type Skill,
} from "@/lib/question-types";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

const SKILL_ICONS: Record<Skill, typeof Mic> = {
  speaking: Mic,
  writing: PenLine,
  reading: BookOpen,
  listening: Headphones,
};

const ACTIVE_TAB_STYLE = {
  background: "linear-gradient(180deg, #ef3b3b 0%, #c8151d 100%)",
  color: "#ffffff",
};

export function MobileNav({
  examPackage,
  isAdmin,
}: {
  examPackage: ExamPackage;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);
  const otherPackage: ExamPackage = examPackage === "academic" ? "core" : "academic";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[85%] gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>PTE-Life</SheetTitle>
        </SheetHeader>

        {/* Segmented control phẳng thay vì shape hình thang chéo của bản desktop —
            trên màn hẹp, cạnh vát chỉ tổ chiếm chỗ và khó bấm đúng vùng. */}
        <div className="flex border-b text-xs font-bold">
          <div
            className="flex-1 px-3 py-2.5 text-center"
            style={examPackage === "academic" ? ACTIVE_TAB_STYLE : undefined}
          >
            <span className={examPackage === "academic" ? "" : "text-muted-foreground/50"}>
              PTE Academic / UKVI
            </span>
          </div>
          <div
            className="flex-1 px-3 py-2.5 text-center"
            style={examPackage === "core" ? ACTIVE_TAB_STYLE : undefined}
          >
            <span className={examPackage === "core" ? "" : "text-muted-foreground/50"}>PTE Core</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">

          <button
            type="button"
            onClick={() => setPracticeOpen((v) => !v)}
            className="flex items-center justify-between gap-1 text-sm font-normal text-gray-700 hover:text-[#e4222b] dark:text-gray-300 dark:hover:text-[#ff5b62]"
          >
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
                <rect x="2" y="15" width="5" height="7" rx="2.5" />
                <rect x="9.5" y="10" width="5" height="12" rx="2.5" />
                <rect x="17" y="3" width="5" height="19" rx="2.5" />
                <path
                  d="M3 13.5L11 5.5M11 5.5H6M11 5.5V10.5"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>{" "}
              Luyện tập PTE
            </span>
            <svg
              width="5"
              height="3"
              viewBox="0 0 10 6"
              fill="currentColor"
              aria-hidden="true"
              className={`transition-transform ${practiceOpen ? "rotate-180" : ""}`}
            >
              <path d="M0 0L5 6L10 0H0Z" />
            </svg>
          </button>

          {practiceOpen &&
            SKILLS.map((skill) => {
            const Icon = SKILL_ICONS[skill];
            const typesForSkill = getQuestionTypesBySkill(skill);
            const included = typesForSkill.filter((t) => t.availableIn.includes(examPackage));
            const excluded = typesForSkill.filter(
              (t) => !t.availableIn.includes(examPackage) && t.availableIn.includes(otherPackage)
            );
            return (
              <div key={skill} className="flex flex-col gap-1.5 pl-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Icon className="size-4" />
                  <span className="pb-0.5" style={{ borderBottom: "2px solid #e4222b" }}>
                    {SKILL_LABELS[skill]}
                  </span>
                </p>
                <div className="flex flex-col gap-0.5 pl-2">
                  {included.map((item) => (
                    <SheetClose
                      key={item.id}
                      nativeButton={false}
                      render={
                        <Link
                          href={`/practice/${skill}/${item.id}`}
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                        />
                      }
                    >
                      <span className="min-w-0 truncate">{item.name}</span>
                      <Badge variant="destructive" className="shrink-0 text-xs">
                        {item.overallWeightPct == null
                          ? "TBD"
                          : item.overallWeightPct === 0
                            ? "< 1%"
                            : `${item.overallWeightPct}%`}
                      </Badge>
                    </SheetClose>
                  ))}
                  {examPackage === "core" && excluded.length > 0 && (
                    <div className="mt-1 flex flex-col gap-0.5 border-t pt-1">
                      {excluded.map((item) => (
                        <p key={item.id} className="truncate px-2 py-1 text-sm text-muted-foreground/60">
                          {item.name} ({otherPackage === "core" ? "Core" : "Academic"})
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <Separator />
          <SheetClose
            nativeButton={false}
            render={
              <Link
                href="/mocktest"
                className="flex items-center gap-1 text-sm font-normal text-gray-700 hover:text-[#e4222b] dark:text-gray-300 dark:hover:text-[#ff5b62]"
              />
            }
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
              <rect x="1" y="3" width="22" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
              <line x1="1" y1="9" x2="23" y2="9" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="5" cy="6.5" r="0.9" fill="currentColor" />
              <circle cx="8" cy="6.5" r="0.9" fill="currentColor" />
              <circle cx="11" cy="6.5" r="0.9" fill="currentColor" />
              <path d="M4 13.2l1.2 1.2L7.5 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M4 17l3 3M7 17l-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="10" y1="18.5" x2="19" y2="18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>{" "}
            Mock Test
          </SheetClose>

          <Separator />

          <button
            type="button"
            onClick={() => setListenOpen((v) => !v)}
            className="flex items-center justify-between gap-1 text-sm font-normal text-gray-700 hover:text-[#e4222b] dark:text-gray-300 dark:hover:text-[#ff5b62]"
          >
            <span className="flex items-center gap-1">
              <Headphones className="size-5" /> Luyện nghe
            </span>
            <svg
              width="5"
              height="3"
              viewBox="0 0 10 6"
              fill="currentColor"
              aria-hidden="true"
              className={`transition-transform ${listenOpen ? "rotate-180" : ""}`}
            >
              <path d="M0 0L5 6L10 0H0Z" />
            </svg>
          </button>
          {listenOpen && (
            <div className="flex flex-col gap-0.5 pl-2">
              {LISTEN_PRACTICE_LINKS.map((item) => (
                <SheetClose
                  key={item.id}
                  nativeButton={false}
                  render={
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    />
                  }
                >
                  <span>{item.name}</span>
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-extrabold text-white"
                    style={{ background: item.color }}
                  >
                    {item.code}
                  </span>
                </SheetClose>
              ))}
            </div>
          )}

          <Separator />
          <SheetClose
            nativeButton={false}
            render={
              <Link
                href="/vocabulary"
                className="text-sm font-normal text-gray-700 hover:text-[#e4222b] dark:text-gray-300 dark:hover:text-[#ff5b62]"
              />
            }
          >
            Sổ từ vựng
          </SheetClose>
          {isAdmin && (
            <SheetClose
              nativeButton={false}
              render={
                <Link
                  href="/admin"
                  className="text-sm font-normal text-gray-700 hover:text-[#e4222b] dark:text-gray-300 dark:hover:text-[#ff5b62]"
                />
              }
            >
              Admin
            </SheetClose>
          )}
        </div>
      </SheetContent>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Mở menu điều hướng"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
    </Sheet>
  );
}
