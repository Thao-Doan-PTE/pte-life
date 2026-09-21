import type { ComponentType } from "react";
import Link from "next/link";
import { Headphones, Mic, BookOpen, PenLine, ArrowRight, Star, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getQuestionTypesBySkill, SKILL_LABELS, type Skill } from "@/lib/question-types";
import type { SkillProgress } from "@/lib/mock-dashboard";

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

const SKILL_CARD_STYLES: Record<Skill, string> = {
  speaking: "bg-amber-500/5 ring-amber-500/15",
  writing: "bg-violet-500/5 ring-violet-500/15",
  reading: "bg-blue-500/5 ring-blue-500/15",
  listening: "bg-red-500/5 ring-red-500/15",
};

const SKILL_DESCRIPTORS: Record<Skill, string> = {
  speaking: "Kỹ năng Nói",
  writing: "Kỹ năng Viết",
  reading: "Kỹ năng Đọc",
  listening: "Kỹ năng Nghe",
};

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export function StartPracticeGrid({ progress }: { progress: SkillProgress[] }) {
  const progressBySkill = new Map(progress.map((p) => [p.skill, p]));

  return (
    <div>
      <h2 className="text-lg font-semibold">Luyện theo kỹ năng</h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Chọn 1 trong 4 kỹ năng thi PTE Academic để bắt đầu luyện đề tủ.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SKILLS.map((skill) => {
          const Icon = SKILL_ICONS[skill];
          const typesForSkill = getQuestionTypesBySkill(skill);
          const skillProgress = progressBySkill.get(skill);
          const targetTypeId = skillProgress?.topType?.id ?? typesForSkill[0]?.id;

          return (
            <Card key={skill} className={SKILL_CARD_STYLES[skill]}>
              <CardContent className="flex flex-col gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${SKILL_ICON_STYLES[skill]}`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{SKILL_LABELS[skill]}</p>
                    <p className="text-sm text-muted-foreground">
                      {SKILL_DESCRIPTORS[skill]} · {typesForSkill.length} module
                    </p>
                  </div>
                  {skillProgress?.avgPteScore != null && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-background px-2 py-1 text-xs font-semibold">
                      <Gauge className="size-3 text-primary" />
                      {skillProgress.avgPteScore}/90
                    </span>
                  )}
                </div>
                <div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${skillProgress?.progressPct ?? 0}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {skillProgress?.progressPct ?? 0}% đề tủ đã luyện
                  </p>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  {skillProgress?.topType ? (
                    <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3 shrink-0 fill-current" />
                      <span className="truncate">{skillProgress.topType.name}</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <Button
                    variant="ghost"
                    className="w-fit shrink-0 gap-1 px-0 text-primary hover:bg-transparent hover:text-primary/80"
                    nativeButton={false}
                    render={<Link href={`/practice/${skill}/${targetTypeId}`} />}
                  >
                    Luyện ngay <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
