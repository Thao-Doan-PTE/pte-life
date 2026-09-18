"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function HighlightWords({
  words,
  onSelectionChange,
}: {
  words: string[];
  onSelectionChange?: (selected: number[]) => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);

  const toggle = (i: number) => {
    const next = selected.includes(i)
      ? selected.filter((x) => x !== i)
      : [...selected, i];
    setSelected(next);
    onSelectionChange?.(next);
  };

  return (
    <p className="rounded-xl border bg-card p-4 text-base leading-loose">
      {words.map((w, i) => (
        <span
          key={i}
          onClick={() => toggle(i)}
          className={cn(
            "mx-0.5 cursor-pointer rounded px-0.5",
            selected.includes(i)
              ? "bg-destructive/20 text-destructive underline decoration-destructive decoration-2"
              : "hover:bg-muted"
          )}
        >
          {w}
        </span>
      ))}
    </p>
  );
}
