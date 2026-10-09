"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListenWaveIcon } from "@/components/layout/nav-listen-menu";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { SKILL_ACCENT_COLOR } from "@/lib/question-types";
import { DIFFICULTY_LABEL, type DifficultyLevel } from "@/lib/difficulty";
import { DifficultyBadge } from "@/components/practice/difficulty-badge";
import { toggleFavoriteAction } from "@/lib/actions/favorites";

interface WfdQuestionItem {
  id: string;
  sentence: string;
  difficulty: DifficultyLevel;
}

function firstWords(text: string, count = 5): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return text;
  return `${words.slice(0, count).join(" ")}...`;
}

function StatusBadge({ done }: { done: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-normal"
      style={
        done
          ? { background: "var(--wfd-green-tint)", color: "var(--wfd-green)" }
          : { background: "var(--wfd-code-bg)", color: "var(--wfd-muted-2)" }
      }
    >
      {done && <Check className="size-3" strokeWidth={3} />}
      {done ? "Đã luyện" : "Chưa luyện"}
    </span>
  );
}

export function WfdQuestionList({
  questions,
  practicedIds,
  favoriteIds,
  weighting,
  bank,
}: {
  questions: WfdQuestionItem[];
  practicedIds: string[];
  favoriteIds: string[];
  weighting: { overall: number; listening: number; writing: number };
  /** "TU" khi vào từ trang Luyện đề Tủ — giữ bộ lọc ngân hàng Tủ khi bắt đầu luyện và khi quay lại. */
  bank?: "TU";
}) {
  const bankQuery = bank ? `?bank=${bank}` : "";
  const backHref = bank ? "/de-tu" : "/luyen-de-pte";
  const practicedSet = useMemo(() => new Set(practicedIds), [practicedIds]);
  const [favoriteSet, setFavoriteSet] = useState<Set<string>>(() => new Set(favoriteIds));
  const [filter, setFilter] = useState<"all" | "done" | "todo" | "favorite">("all");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | "all">("all");
  const [selectedId, setSelectedId] = useState(questions[0]?.id ?? "");

  // Đổi filter (trạng thái hoặc độ khó) thì luôn nhảy về câu đầu tiên khớp cả
  // hai điều kiện, kể cả khi câu đang chọn vẫn khớp — tránh gây khó hiểu khi
  // bảng xem trước không đổi.
  function findFirstMatch(statusFilter: typeof filter, diffFilter: typeof difficultyFilter) {
    return questions.find((q) => {
      if (statusFilter === "done" && !practicedSet.has(q.id)) return false;
      if (statusFilter === "todo" && practicedSet.has(q.id)) return false;
      if (statusFilter === "favorite" && !favoriteSet.has(q.id)) return false;
      if (diffFilter !== "all" && q.difficulty !== diffFilter) return false;
      return true;
    });
  }

  function changeFilter(next: typeof filter) {
    setFilter(next);
    setSelectedId((prevId) => findFirstMatch(next, difficultyFilter)?.id ?? prevId);
  }

  function changeDifficultyFilter(next: typeof difficultyFilter) {
    setDifficultyFilter(next);
    setSelectedId((prevId) => findFirstMatch(filter, next)?.id ?? prevId);
  }

  function toggleFavorite(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const wasFavorited = favoriteSet.has(id);
    setFavoriteSet((prev) => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(id);
      else next.add(id);
      return next;
    });
    toggleFavoriteAction(id).catch(() => {
      setFavoriteSet((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.add(id);
        else next.delete(id);
        return next;
      });
    });
  }

  const filtered = questions.filter((q) => {
    if (filter === "done" && !practicedSet.has(q.id)) return false;
    if (filter === "todo" && practicedSet.has(q.id)) return false;
    if (filter === "favorite" && !favoriteSet.has(q.id)) return false;
    if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;
    return true;
  });

  const selected = questions.find((q) => q.id === selectedId) ?? questions[0];
  const doneCount = questions.filter((q) => practicedSet.has(q.id)).length;
  const favoriteCount = questions.filter((q) => favoriteSet.has(q.id)).length;

  const selectedIndexInFiltered = filtered.findIndex((q) => q.id === selected?.id);
  const prevQuestion = selectedIndexInFiltered > 0 ? filtered[selectedIndexInFiltered - 1] : null;
  const nextQuestion =
    selectedIndexInFiltered >= 0 && selectedIndexInFiltered < filtered.length - 1
      ? filtered[selectedIndexInFiltered + 1]
      : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:py-8">
      <Link
        href={backHref}
        className="flex w-fit items-center gap-1 text-[15px] font-normal transition-colors hover:text-[var(--wfd-red)]"
        style={{ color: "var(--wfd-muted)" }}
      >
        <ChevronLeft className="size-4" /> Quay về trang luyện đề
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:items-center">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-xl text-[15px] font-extrabold text-white sm:size-16 sm:rounded-2xl sm:text-2xl"
            style={{ background: SKILL_ACCENT_COLOR.listening }}
          >
            WFD
          </span>
          <div>
            <h1 className="text-[20px] font-bold sm:text-2xl sm:text-[26px]">Write From Dictation</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[15px] sm:gap-2">
              <div
                className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2.5 py-1.5 text-xs sm:px-3 sm:text-[13px]"
                style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-muted)" }}
              >
                <span>Score Weight</span>
                <span>Overall: {weighting.overall}%</span>
                <span>Writing: {weighting.writing}%</span>
                <span>Listening: {weighting.listening}%</span>
              </div>
              <Link
                href="/weighting?type=write-from-dictation#write-from-dictation"
                className="text-[13px] font-semibold"
                style={{ color: "var(--wfd-red-dark)" }}
              >
                Xem bảng trọng số đầy đủ ↗
              </Link>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/practice/listening/write-from-dictation/luyen-nghe"
            className="flex items-center gap-1.5 rounded-[10px] border bg-white px-3 py-1.5 text-[13px] font-bold text-[var(--wfd-red)] shadow-sm transition-colors hover:bg-[var(--wfd-red)] hover:text-white hover:shadow-md sm:px-5 sm:py-2 sm:text-[15px]"
            style={{ borderColor: "color-mix(in srgb, var(--wfd-red) 45%, transparent)" }}
          >
            <ListenWaveIcon className="size-4 sm:size-5" /> Luyện nghe
          </Link>
        </div>
      </div>

      <p className="text-left text-[15px] font-normal" style={{ color: "var(--wfd-muted)" }}>
        {questions.length} câu WFD - Chọn câu hỏi để luyện tập.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <div
          className="flex flex-col overflow-hidden rounded-2xl border"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          <div className="flex flex-col gap-3 border-b p-4" style={{ borderColor: "var(--wfd-border)" }}>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["all", `Tất cả ${questions.length}`],
                  ["done", `Đã luyện ${doneCount}`],
                  ["todo", `Chưa luyện ${questions.length - doneCount}`],
                  ["favorite", `Yêu thích ${favoriteCount}`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeFilter(key)}
                  className="rounded-lg px-2.5 py-1.5 text-[13px] font-normal"
                  style={
                    filter === key
                      ? {
                          background:
                            key === "done" ? "var(--wfd-green)" : key === "favorite" ? "#f59e0b" : "var(--wfd-red)",
                          color: "#fff",
                        }
                      : { background: "var(--wfd-code-bg)", color: "var(--wfd-muted)" }
                  }
                >
                  {label}
                </button>
              ))}
              <select
                value={difficultyFilter}
                onChange={(e) => changeDifficultyFilter(e.target.value as typeof difficultyFilter)}
                className="rounded-lg border px-2.5 py-1.5 text-[13px] font-normal outline-none"
                style={{ borderColor: "var(--wfd-border)", background: "var(--wfd-surface)", color: "var(--wfd-muted)" }}
              >
                <option value="all">Mọi độ khó</option>
                {(["EASY", "MEDIUM", "HARD"] as const).map((level) => (
                  <option key={level} value={level}>
                    {DIFFICULTY_LABEL[level]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[140px] overflow-y-auto">
            {filtered.map((q) => {
              const done = practicedSet.has(q.id);
              const fav = favoriteSet.has(q.id);
              const isSelected = q.id === selected?.id;
              const num = questions.indexOf(q) + 1;
              return (
                <div
                  key={q.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(q.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(q.id);
                    }
                  }}
                  className="flex w-full cursor-pointer items-center gap-1.5 border-b border-l-[3px] px-3 py-2 text-left last:border-b-0 sm:gap-2.5 sm:px-4 sm:py-2.5"
                  style={{
                    borderColor: isSelected ? "var(--wfd-amber)" : "var(--wfd-border)",
                    borderLeftColor: isSelected ? "var(--wfd-amber)" : "transparent",
                    background: isSelected ? "var(--wfd-bg)" : "transparent",
                  }}
                >
                  <span className="wfd-mono shrink-0 text-xs font-bold sm:text-[13px]" style={{ color: "var(--wfd-muted-2)" }}>
                    Câu {num}
                  </span>
                  <span className="font-passage min-w-0 flex-1 truncate text-[13px] sm:text-[16px]">{firstWords(q.sentence)}</span>
                  <DifficultyBadge level={q.difficulty} size="sm" />
                  {done ? (
                    <CheckCircle2 className="size-3.5 shrink-0 sm:size-4" style={{ color: "var(--wfd-green)" }} />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(q.id, e)}
                      aria-label={fav ? "Bỏ ưa thích" : "Đánh dấu ưa thích"}
                      className="flex shrink-0 items-center justify-center"
                    >
                      <Star className="size-3.5 sm:size-4" style={{ color: fav ? "#f59e0b" : "var(--wfd-border)" }} fill={fav ? "#f59e0b" : "none"} />
                    </button>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="p-4 text-center text-[15px]" style={{ color: "var(--wfd-muted)" }}>
                Không tìm thấy câu nào khớp.
              </p>
            )}
          </div>
        </div>

        <div
          className="flex h-full flex-col gap-3 rounded-2xl border p-4 sm:gap-4 sm:p-5"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          {selected ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="wfd-mono px-1 text-[15px] font-bold" style={{ color: "var(--wfd-ink)" }}>
                    Câu {questions.indexOf(selected) + 1}
                  </span>
                  <StatusBadge done={practicedSet.has(selected.id)} />
                  <DifficultyBadge level={selected.difficulty} />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => prevQuestion && setSelectedId(prevQuestion.id)}
                    disabled={!prevQuestion}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border disabled:opacity-40 sm:size-8"
                    style={{ borderColor: "var(--wfd-border)" }}
                    aria-label="Câu trước"
                  >
                    <ChevronLeft className="size-3.5 sm:size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => nextQuestion && setSelectedId(nextQuestion.id)}
                    disabled={!nextQuestion}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border disabled:opacity-40 sm:size-8"
                    style={{ borderColor: "var(--wfd-border)" }}
                    aria-label="Câu tiếp theo"
                  >
                    <ChevronRight className="size-3.5 sm:size-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 flex-col items-start justify-center gap-3">
                <p className="font-passage text-[15px] leading-snug font-semibold sm:text-[20px]">{selected.sentence}</p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  href={`/practice/listening/write-from-dictation/${selected.id}${bankQuery}`}
                  className="flex w-fit items-center justify-center gap-2 rounded-[10px] px-6 py-3 text-[15px] font-bold"
                  style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
                >
                  Bắt đầu luyện tập
                </Link>
                <p className="text-[13px]" style={{ color: "var(--wfd-muted-2)" }}>
                  Câu sẽ được phát 1 lần duy nhất — hãy nghe kỹ và gõ lại chính xác từng từ.
                </p>
              </div>
            </>
          ) : (
            <p className="p-6 text-center text-[15px]" style={{ color: "var(--wfd-muted)" }}>
              Không có câu hỏi nào khớp bộ lọc hiện tại.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
