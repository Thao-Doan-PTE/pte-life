import { cn } from "@/lib/utils";

export function HighlightReview({
  words,
  selected,
  incorrectIndexes,
}: {
  words: string[];
  selected: number[];
  incorrectIndexes: number[];
}) {
  const incorrectSet = new Set(incorrectIndexes);
  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-col gap-2">
      <p className="rounded-xl border bg-card p-4 text-base leading-loose">
        {words.map((w, i) => {
          const shouldPick = incorrectSet.has(i);
          const picked = selectedSet.has(i);
          return (
            <span
              key={i}
              className={cn(
                "mx-0.5 rounded px-0.5",
                shouldPick &&
                  picked &&
                  "bg-emerald-500/15 text-emerald-700 underline decoration-2 dark:text-emerald-400",
                shouldPick &&
                  !picked &&
                  "border border-dashed border-amber-500 text-amber-700 dark:text-amber-400",
                !shouldPick &&
                  picked &&
                  "bg-destructive/15 text-destructive line-through"
              )}
            >
              {w}
            </span>
          );
        })}
      </p>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="text-emerald-700 dark:text-emerald-400">
          ■ Bạn chọn đúng
        </span>
        <span className="text-destructive">■ Bạn chọn sai</span>
        <span className="text-amber-700 dark:text-amber-400">□ Bạn bỏ sót</span>
      </div>
    </div>
  );
}
