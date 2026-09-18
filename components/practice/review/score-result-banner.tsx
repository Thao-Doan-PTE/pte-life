import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreColorClass } from "@/lib/format";

export function ScoreResultBanner({
  scorePct,
  pteScore,
  correct,
  method = "rule-based",
}: {
  scorePct: number;
  pteScore: number;
  correct: boolean;
  method?: "rule-based" | "ai";
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4",
        correct
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      )}
    >
      {correct ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
      ) : (
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
      )}
      <div className="flex flex-col gap-0.5 text-sm">
        <p className="font-semibold">
          <span className={scoreColorClass(scorePct)}>{scorePct}% đúng</span>
          {" · "}Điểm PTE ước tính: {pteScore}/90
        </p>
        <p className="text-xs text-muted-foreground">
          {method === "ai"
            ? "Chấm bằng AI"
            : "Chấm tự động (rule-based)"}{" "}
          — điểm ước tính để luyện tập, không phải điểm thi chính thức.
        </p>
      </div>
    </div>
  );
}
