import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChoiceReview({
  options,
  selected,
  correctIndexes,
}: {
  options: string[];
  selected: number[];
  correctIndexes: number[];
}) {
  const correctSet = new Set(correctIndexes);
  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-col gap-2">
      {options.map((opt, i) => {
        const isCorrect = correctSet.has(i);
        const isSelected = selectedSet.has(i);
        return (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
              isCorrect && "border-emerald-500/40 bg-emerald-500/5",
              isSelected && !isCorrect && "border-destructive/40 bg-destructive/5"
            )}
          >
            {isCorrect ? (
              <Check className="size-4 shrink-0 text-emerald-600" />
            ) : isSelected ? (
              <X className="size-4 shrink-0 text-destructive" />
            ) : (
              <span className="size-4 shrink-0" />
            )}
            <span>{opt}</span>
          </div>
        );
      })}
    </div>
  );
}
