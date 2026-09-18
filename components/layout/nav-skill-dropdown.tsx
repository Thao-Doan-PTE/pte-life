"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, Headphones, Mic, PenLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getQuestionTypesBySkill, SKILL_LABELS, type Skill } from "@/lib/question-types";

const SKILL_ICONS: Record<Skill, typeof Mic> = {
  speaking: Mic,
  writing: PenLine,
  reading: BookOpen,
  listening: Headphones,
};

export function NavSkillDropdown({ skill }: { skill: Skill }) {
  const items = getQuestionTypesBySkill(skill);
  const Icon = SKILL_ICONS[skill];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" className="gap-1.5 px-3" />}>
        <Icon className="size-4" />
        {SKILL_LABELS[skill]}
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            render={<Link href={`/practice/${skill}/${item.id}`} />}
            className="flex items-center justify-between gap-3"
          >
            <span className="min-w-0 truncate">{item.name}</span>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {item.overallWeightPct != null ? `${item.overallWeightPct}%` : "TBD"}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
