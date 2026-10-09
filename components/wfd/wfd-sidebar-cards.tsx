import type { ReactNode } from "react";
import { Lightbulb } from "lucide-react";

export function WfdTipsCard({ tips, title = "Mẹo làm bài" }: { tips: ReactNode[]; title?: string }) {
  if (tips.length === 0) return null;
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--wfd-amber-tint)", borderColor: "var(--wfd-amber-tint-border)" }}
    >
      <p className="flex items-center gap-1.5 text-[15px] font-bold" style={{ color: "var(--wfd-amber-heading)" }}>
        <Lightbulb className="size-4" style={{ color: "var(--wfd-amber-heading)" }} />
        {title}
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {tips.map((t, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[14px] leading-relaxed"
            style={{ color: "var(--wfd-amber-text)" }}
          >
            <span className="mt-1.5 size-1 shrink-0 rounded-full" style={{ background: "var(--wfd-amber)" }} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
