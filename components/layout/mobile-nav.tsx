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
import {
  getQuestionTypesBySkill,
  SKILL_LABELS,
  type Skill,
} from "@/lib/question-types";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

const SKILL_ICONS: Record<Skill, typeof Mic> = {
  speaking: Mic,
  writing: PenLine,
  reading: BookOpen,
  listening: Headphones,
};

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-[85%] gap-0 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>PTE-Life</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          {SKILLS.map((skill) => {
            const Icon = SKILL_ICONS[skill];
            return (
              <div key={skill} className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Icon className="size-4" />
                  {SKILL_LABELS[skill]}
                </p>
                <div className="flex flex-col gap-0.5 pl-2">
                  {getQuestionTypesBySkill(skill).map((item) => (
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
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {item.overallWeightPct != null
                          ? `${item.overallWeightPct}%`
                          : "TBD"}
                      </Badge>
                    </SheetClose>
                  ))}
                </div>
              </div>
            );
          })}
          <Separator />
          <SheetClose
            nativeButton={false}
            render={<Link href="/history" className="text-sm font-medium" />}
          >
            Lịch sử
          </SheetClose>
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
