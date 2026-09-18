import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SKILL_LABELS, type Skill } from "@/lib/question-types";

export function PracticeHeader({
  skill,
  typeId,
  typeName,
  typeCode,
  descriptionVi,
  questionCode,
  index,
  total,
  streakDays,
}: {
  skill: Skill;
  typeId: string;
  typeName: string;
  typeCode: string;
  descriptionVi: string;
  questionCode: string;
  index: number;
  total: number;
  streakDays: number;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/practice/${skill}/${typeId}`}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: "var(--wfd-muted)" }}
        >
          <ChevronLeft className="size-4" /> Danh sách câu hỏi
        </Link>
        <div className="flex items-center gap-2">
          <span
            className="wfd-mono flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: "#FFF1E0", color: "#C2410C" }}
          >
            🔥 {streakDays} ngày liên tiếp
          </span>
          <span
            className="wfd-mono rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
          >
            Câu #{index + 1}
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold tracking-wide uppercase" style={{ color: "var(--wfd-red-dark)" }}>
          {SKILL_LABELS[skill]} · {typeName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-[26px]">{typeName}</h1>
          <span
            className="wfd-mono rounded-md px-2 py-0.5 text-xs font-bold"
            style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
          >
            {typeCode}
          </span>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--wfd-muted)" }}>
          {descriptionVi}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--wfd-muted)" }}>
          Câu {index + 1}/{total} · Mã {questionCode}
        </p>
      </div>
    </div>
  );
}
