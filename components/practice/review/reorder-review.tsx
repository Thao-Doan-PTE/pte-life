import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParagraphItem } from "@/components/practice/reorder-paragraphs";

export function ReorderReview({
  userOrder,
  correctOrder,
}: {
  userOrder: ParagraphItem[];
  correctOrder: string[];
}) {
  const byId = new Map(userOrder.map((p) => [p.id, p]));
  const allCorrect = userOrder.every((p, i) => correctOrder[i] === p.id);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {userOrder.map((p, i) => {
          const isRight = correctOrder[i] === p.id;
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-sm",
                isRight
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-destructive/40 bg-destructive/5"
              )}
            >
              {isRight ? (
                <Check className="size-4 shrink-0 text-emerald-600" />
              ) : (
                <X className="size-4 shrink-0 text-destructive" />
              )}
              <p>{p.text}</p>
            </div>
          );
        })}
      </div>

      {!allCorrect && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Thứ tự đúng:
          </p>
          {correctOrder.map((id, i) => (
            <p key={id} className="text-xs text-muted-foreground">
              {i + 1}. {byId.get(id)?.text}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
