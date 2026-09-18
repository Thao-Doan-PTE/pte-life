"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChoiceQuestion({
  passage,
  question,
  options,
  maxSelectable = 1,
  onSubmit,
}: {
  passage?: string;
  question: string;
  options: string[];
  maxSelectable?: number;
  onSubmit: (selected: number[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const isMultiple = maxSelectable > 1;

  const toggle = (index: number) => {
    if (submitted) return;
    setSelected((prev) => {
      if (!isMultiple) return [index];
      if (prev.includes(index)) return prev.filter((i) => i !== index);
      if (prev.length >= maxSelectable) return prev;
      return [...prev, index];
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {passage && (
        <p className="whitespace-pre-line rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          {passage}
        </p>
      )}
      <p className="font-medium">{question}</p>
      {isMultiple && (
        <p className="text-xs text-muted-foreground">
          Chọn tối đa {maxSelectable} đáp án.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isChecked = selected.includes(i);
          return (
            <label
              key={i}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                isChecked ? "border-primary bg-primary/5" : "hover:bg-muted",
                submitted && "cursor-default opacity-80"
              )}
            >
              <input
                type={isMultiple ? "checkbox" : "radio"}
                name="choice-question"
                checked={isChecked}
                onChange={() => toggle(i)}
                disabled={submitted}
                className="accent-primary"
              />
              {opt}
            </label>
          );
        })}
      </div>
      {!submitted && (
        <Button
          className="w-fit bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
          disabled={selected.length === 0}
          onClick={() => {
            setSubmitted(true);
            onSubmit(selected);
          }}
        >
          Nộp bài
        </Button>
      )}
    </div>
  );
}
