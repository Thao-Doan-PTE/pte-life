"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Headphones, Mic, PenLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function NavSkillMenu({ skill, examPackage }: { skill: Skill; examPackage: ExamPackage }) {
  const pathname = usePathname();
  const active = pathname.startsWith(`/practice/${skill}`);
  const Icon = SKILL_ICONS[skill];
  const otherPackage: ExamPackage = examPackage === "academic" ? "core" : "academic";
  const types = getQuestionTypesBySkill(skill);
  const included = types.filter((t) => t.availableIn.includes(examPackage));
  const excluded = types.filter((t) => !t.availableIn.includes(examPackage) && t.availableIn.includes(otherPackage));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        openOnHover
        delay={60}
        closeDelay={150}
        render={
          <Button
            variant="ghost"
            className={`group h-16 gap-1.5 px-3 text-[14px] leading-5 font-normal hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent dark:aria-expanded:bg-transparent ${
              active
                ? "text-[#d6474c] hover:text-[#d6474c] aria-expanded:text-[#d6474c]"
                : "text-gray-500 hover:text-gray-900 aria-expanded:text-gray-900 dark:text-gray-400 dark:hover:text-white dark:aria-expanded:text-white"
            }`}
          />
        }
      >
        <Icon className="size-5" strokeWidth={1.6} />
        <span className="relative inline-flex h-full items-center">
          {SKILL_LABELS[skill]}
          <span
            className={`absolute bottom-0 left-0 h-[3px] bg-[#d6474c] transition-all duration-300 group-hover:w-full group-aria-expanded:w-full ${
              active ? "w-full" : "w-0"
            }`}
          />
        </span>
        <svg className="size-2.5" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[280px] p-1.5">
        {included.map((item) => (
          <DropdownMenuItem
            key={item.id}
            render={<Link href={`/practice/${skill}/${item.id}`} />}
            className="flex items-center justify-between gap-3 px-2.5 py-2 text-sm"
          >
            <span className="min-w-0 truncate">{item.name}</span>
            <Badge variant="destructive" className="shrink-0 text-xs">
              {item.overallWeightPct == null ? "TBD" : item.overallWeightPct === 0 ? "< 1%" : `${item.overallWeightPct}%`}
            </Badge>
          </DropdownMenuItem>
        ))}
        {examPackage === "core" && excluded.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5 border-t pt-1">
            {excluded.map((item) => (
              <p key={item.id} className="m-0 truncate px-2.5 py-1.5 text-sm text-muted-foreground">
                {item.name} (Academic)
              </p>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NavSkillMenus({ examPackage }: { examPackage: ExamPackage }) {
  return (
    <>
      {SKILLS.map((skill) => (
        <NavSkillMenu key={skill} skill={skill} examPackage={examPackage} />
      ))}
    </>
  );
}
