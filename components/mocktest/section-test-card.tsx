"use client";

import { useState } from "react";
import { LayoutList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSectionTestSession } from "@/lib/actions/mocktest";
import { SKILL_LABELS, type Skill } from "@/lib/question-types";
import { RandomizeToggle } from "@/components/mocktest/randomize-toggle";

const SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

export function SectionTestCard() {
  const [skill, setSkill] = useState<Skill>("speaking");
  const [randomize, setRandomize] = useState(false);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutList className="size-5" />
        </div>
        <div>
          <p className="font-medium">Section Test</p>
          <p className="text-sm text-muted-foreground">
            Thi theo từng phần kỹ năng, đủ các dạng câu hỏi trong phần đó.
          </p>
        </div>

        <form action={createSectionTestSession} className="flex flex-col gap-2">
          <input type="hidden" name="skill" value={skill} />
          <input type="hidden" name="randomize" value={String(randomize)} />

          <Select
            items={Object.fromEntries(SKILLS.map((s) => [s, SKILL_LABELS[s]]))}
            value={skill}
            onValueChange={(v) => v && setSkill(v as Skill)}
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

          <RandomizeToggle value={randomize} onChange={setRandomize} />

          <Button
            type="submit"
            className="mt-1 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
          >
            Bắt đầu
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
