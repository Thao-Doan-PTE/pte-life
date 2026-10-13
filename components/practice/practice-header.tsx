import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones } from "lucide-react";
import { SKILL_LABELS, SKILL_ACCENT_COLOR, type Skill } from "@/lib/question-types";
import { NEW_HEADER_TYPE_IDS } from "@/lib/practice-config";
import { FavoriteStarButton } from "@/components/practice/favorite-star-button";

export function PracticeHeader({
  listHref,
  skill,
  typeId,
  typeName,
  typeCode,
  descriptionVi,
  instructionText,
  questionId,
  questionCode,
  index,
  total,
  streakDays,
  isFavorited,
}: {
  /** Link "Danh sách câu hỏi" — giữ ?bank=TU khi đang luyện bộ đề Tủ. */
  listHref?: string;
  skill: Skill;
  typeId: string;
  typeName: string;
  typeCode: string;
  descriptionVi: string;
  instructionText: ReactNode;
  questionId: string;
  questionCode: string;
  index: number;
  total: number;
  streakDays: number;
  isFavorited: boolean;
}) {
  const backLink = (
    <Link
      href={listHref ?? `/practice/${skill}/${typeId}`}
      className="flex items-center gap-1 text-[15px] font-normal"
      style={{ color: "var(--wfd-muted)" }}
    >
      <ArrowLeft className="size-4" /> Danh sách câu hỏi
    </Link>
  );

  if (NEW_HEADER_TYPE_IDS.has(typeId)) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backLink}
          <span
            className="wfd-mono rounded-full px-3 py-1 text-[13px] font-bold"
            style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
          >
            Câu {index + 1} / {total}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl font-extrabold whitespace-nowrap text-white ${
              typeCode.length > 4 ? "text-[11px] tracking-tight" : "text-[17px]"
            }`}
            style={{ background: SKILL_ACCENT_COLOR[skill] }}
          >
            {typeCode}
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-2xl">{typeName}</h1>
          </div>
        </div>

        <div
          className="flex items-start gap-2.5 rounded-lg border-t-2 px-4 py-3 text-[15px] font-medium"
          style={{ borderColor: "#f59e0b", background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
        >
          <Headphones className="mt-0.5 size-4 shrink-0" style={{ color: "#f59e0b" }} />
          <p>{instructionText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backLink}
        <div className="flex items-center gap-2">
          <span
            className="wfd-mono flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold"
            style={{ background: "#FFF1E0", color: "#C2410C" }}
          >
            🔥 {streakDays} ngày liên tiếp
          </span>
          <span
            className="wfd-mono rounded-full px-3 py-1 text-[13px] font-bold"
            style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
          >
            Câu #{index + 1}
          </span>
          <FavoriteStarButton questionId={questionId} initialFavorited={isFavorited} />
        </div>
      </div>

      <div>
        <p className="text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--wfd-red-dark)" }}>
          {SKILL_LABELS[skill]} · {typeName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-[26px]">{typeName}</h1>
          <span
            className="wfd-mono rounded-md px-2 py-0.5 text-[13px] font-bold"
            style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
          >
            {typeCode}
          </span>
        </div>
        <p className="mt-1 text-[15px]" style={{ color: "var(--wfd-muted)" }}>
          {descriptionVi}
        </p>
        <p className="mt-1 text-[15px]" style={{ color: "var(--wfd-muted)" }}>
          Câu {index + 1}/{total} · Mã {questionCode}
        </p>
      </div>
    </div>
  );
}
