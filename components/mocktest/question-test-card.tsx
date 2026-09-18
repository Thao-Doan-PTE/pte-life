"use client";

import { useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createQuestionTestSession } from "@/lib/actions/mocktest";
import {
  QUESTION_TYPES,
  SKILL_LABELS,
  type Skill,
  type ExamPackage,
} from "@/lib/question-types";
import { RandomizeToggle } from "@/components/mocktest/randomize-toggle";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export function QuestionTestCard({ examPackage }: { examPackage: ExamPackage }) {
  const [skill, setSkill] = useState<Skill>("speaking");
  const [randomize, setRandomize] = useState(false);

  const typesForSkill = useMemo(
    () =>
      QUESTION_TYPES.filter(
        (t) => t.skill === skill && t.availableIn.includes(examPackage)
      ),
    [skill, examPackage]
  );
  const [typeId, setTypeId] = useState(typesForSkill[0]?.id ?? "");

  const handleSkillChange = (value: string) => {
    const nextSkill = value as Skill;
    setSkill(nextSkill);
    const firstType = QUESTION_TYPES.find(
      (t) => t.skill === nextSkill && t.availableIn.includes(examPackage)
    );
    setTypeId(firstType?.id ?? "");
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ListChecks className="size-5" />
        </div>
        <div>
          <p className="font-medium">Question Test</p>
          <p className="text-sm text-muted-foreground">
            Luyện nhanh nhiều câu liên tiếp theo 1 dạng câu hỏi, có tính giờ.
          </p>
        </div>

        <form action={createQuestionTestSession} className="flex flex-col gap-2">
          <input type="hidden" name="questionTypeId" value={typeId} />
          <input type="hidden" name="randomize" value={String(randomize)} />

          <Select
            items={Object.fromEntries(SKILLS.map((s) => [s, SKILL_LABELS[s]]))}
            value={skill}
            onValueChange={(v) => v && handleSkillChange(v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SKILLS.map((s) => (
                <SelectItem key={s} value={s}>
                  {SKILL_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={Object.fromEntries(typesForSkill.map((t) => [t.id, `${t.code} — ${t.name}`]))}
            value={typeId}
            onValueChange={(v) => setTypeId(v ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typesForSkill.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.code} — {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <RandomizeToggle value={randomize} onChange={setRandomize} />

          <Button
            type="submit"
            disabled={!typeId}
            className="mt-1 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
          >
            Bắt đầu
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
