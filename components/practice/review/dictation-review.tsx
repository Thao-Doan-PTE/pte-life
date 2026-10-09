import { cn } from "@/lib/utils";
import type { DictationWordDiff } from "@/lib/scoring/rule-based";

export function DictationReview({ diff }: { diff: DictationWordDiff[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-passage rounded-xl border bg-card p-4 text-[17px] leading-[1.8]">
        {diff.map((d, i) => (
          <span
            key={i}
            className={cn(
              "mx-0.5",
              d.status === "correct" &&
                "text-emerald-700 dark:text-emerald-400",
              d.status === "wrong" &&
                "text-destructive underline decoration-destructive decoration-2",
              d.status === "missing" &&
                "text-muted-foreground underline decoration-dotted"
            )}
          >
            {d.word}
          </span>
        ))}
      </p>
      <div className="flex flex-wrap gap-3 text-[13px] text-muted-foreground">
        <span className="text-emerald-700 dark:text-emerald-400">■ Đúng</span>
        <span className="text-destructive">■ Sai</span>
        <span>■ Thiếu</span>
      </div>
    </div>
  );
}
