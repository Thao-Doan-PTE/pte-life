import { cn } from "@/lib/utils";
import type { BlankSegment } from "@/components/practice/dropdown-blanks";

export function BlanksReview({
  segments,
  userAnswers,
  correctAnswers,
}: {
  segments: BlankSegment[];
  userAnswers: Record<string, string>;
  correctAnswers: Record<string, string>;
}) {
  const isBlankCorrect = (id: string) =>
    (userAnswers[id] ?? "").trim().toLowerCase() ===
    (correctAnswers[id] ?? "").trim().toLowerCase();

  const blanks = segments.filter((s) => s.type === "blank");

  return (
    <div className="flex flex-col gap-3">
      <p className="whitespace-pre-line rounded-xl border bg-card p-4 text-base leading-loose">
        {segments.map((seg, i) =>
          seg.type === "text" ? (
            <span key={i}>{seg.value}</span>
          ) : (
            <span
              key={i}
              className={cn(
                "mx-1 inline-block rounded px-1.5 py-0.5 text-sm",
                isBlankCorrect(seg.id!)
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {userAnswers[seg.id!] || "(bỏ trống)"}
            </span>
          )
        )}
      </p>
      {blanks.some((s) => !isBlankCorrect(s.id!)) && (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {blanks.map(
            (s, i) =>
              !isBlankCorrect(s.id!) && (
                <p key={i}>
                  Đáp án đúng cho chỗ trống {i + 1}:{" "}
                  <span className="font-medium text-foreground">
                    {correctAnswers[s.id!]}
                  </span>
                </p>
              )
          )}
        </div>
      )}
    </div>
  );
}
