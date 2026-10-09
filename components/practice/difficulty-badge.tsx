import { DIFFICULTY_COLOR, DIFFICULTY_LABEL, type DifficultyLevel } from "@/lib/difficulty";

export function DifficultyBadge({
  level,
  size = "md",
}: {
  level: DifficultyLevel;
  size?: "sm" | "md";
}) {
  const color = DIFFICULTY_COLOR[level];
  const sizeClassName = size === "sm" ? "px-1.5 py-0.5 text-[13px]" : "px-3 py-1 text-[13px]";
  return (
    <span
      className={`shrink-0 rounded-full border font-normal whitespace-nowrap ${sizeClassName}`}
      style={{ borderColor: color, color }}
    >
      {DIFFICULTY_LABEL[level]}
    </span>
  );
}
