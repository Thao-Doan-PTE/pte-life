import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Headphones } from "lucide-react";
import { SKILL_LABELS, SKILL_ACCENT_COLOR, type Skill } from "@/lib/question-types";
import { AUDIO_TASK_TYPE_IDS } from "@/lib/practice-config";
import { FavoriteStarButton } from "@/components/practice/favorite-star-button";

export function PracticeHeader({
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
      href={`/practice/${skill}/${typeId}`}
      className="flex items-center gap-1 text-sm font-medium"
      style={{ color: "var(--wfd-muted)" }}
    >
      <ArrowLeft className="size-4" /> Danh sách câu hỏi
    </Link>
  );

  if (AUDIO_TASK_TYPE_IDS.has(typeId)) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backLink}
          <span
            className="wfd-mono rounded-full px-3 py-1 text-xs font-bold"
            style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
          >
            Câu {index + 1} / {total}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white"
              style={{ background: SKILL_ACCENT_COLOR[skill] }}
            >
              {typeCode}
            </div>
            <span
              className="absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold text-white"
              style={{ background: "#f59e0b" }}
            >
              AI
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-[26px]">{typeName}</h1>
          </div>
        </div>

        <div
          className="flex items-start gap-2.5 rounded-lg border-t-2 px-4 py-3 text-sm font-medium"
          style={{ borderColor: "#f59e0b", background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
        >
          <Headphones className="mt-0.5 size-4 shrink-0" style={{ color: "#f59e0b" }} />
          <p>{instructionText}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4" style={{ borderColor: "var(--wfd-border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="wfd-mono rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "var(--wfd-black-tint)", color: "var(--wfd-ink)" }}
            >
              #{questionCode}
            </span>
            <span
              className="rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "var(--wfd-navy-tint)", color: "var(--wfd-navy)" }}
            >
              {typeName}
            </span>
            {/* Trang trí, chưa có dữ liệu độ khó thật — gắn sau khi có */}
            <span
              className="rounded-full border px-3 py-1 text-xs font-bold"
              style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
            >
              Trung bình
            </span>
          </div>
          <FavoriteStarButton questionId={questionId} initialFavorited={isFavorited} />
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
          <FavoriteStarButton questionId={questionId} initialFavorited={isFavorited} />
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
