"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Eye,
  Mic,
  Repeat,
  Image,
  Presentation,
  MessageCircleQuestion,
  Users,
  Reply,
  FileText,
  PenLine,
  ListCollapse,
  ListChecks,
  ArrowUpDown,
  Move,
  CircleDot,
  FileAudio,
  SquareCheckBig,
  TextCursorInput,
  Highlighter,
  CircleCheck,
  Puzzle,
  SearchX,
  Gauge,
  BookOpen,
  Headphones,
  Search,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import {
  SKILL_LABELS,
  SKILL_ACCENT_COLOR,
  type QuestionTypeWeighting,
  type Skill,
} from "@/lib/question-types";

interface PracticeQuestionItem {
  id: string;
  excerpt: string;
}

const SKILL_DISPLAY_ORDER: Skill[] = ["listening", "reading", "speaking", "writing"];

/** Mỗi dạng câu hỏi (trừ WFD — có icon riêng ở wfd-question-list.tsx) 1 icon riêng
 * biệt, không dùng chung icon theo kỹ năng — chỉ màu vẫn theo kỹ năng để giữ hệ
 * thống màu nhất quán. */
const TYPE_ICONS: Record<string, LucideIcon> = {
  "read-aloud": Mic,
  "repeat-sentence": Repeat,
  "describe-image": Image,
  "retell-lecture": Presentation,
  "answer-short-question": MessageCircleQuestion,
  "summarize-group-discussion": Users,
  "respond-to-situation": Reply,
  "summarize-written-text": FileText,
  "write-essay": PenLine,
  "reading-fill-blanks-dropdown": ListCollapse,
  "reading-mcq-multiple": ListChecks,
  "reorder-paragraphs": ArrowUpDown,
  "reading-fill-blanks-drag-drop": Move,
  "reading-mcq-single": CircleDot,
  "summarize-spoken-text": FileAudio,
  "listening-mcq-multiple": SquareCheckBig,
  "listening-fill-blanks": TextCursorInput,
  "highlight-correct-summary": Highlighter,
  "listening-mcq-single": CircleCheck,
  "select-missing-word": Puzzle,
  "highlight-incorrect-words": SearchX,
};

const SKILL_ICONS: Record<Skill, LucideIcon> = {
  speaking: Mic,
  writing: PenLine,
  reading: BookOpen,
  listening: Headphones,
};

function firstWords(text: string, count = 3): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= count) return text;
  return `${words.slice(0, count).join(" ")}...`;
}

function StatusBadge({ done }: { done: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
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

export function PracticeQuestionList({
  skill,
  typeId,
  typeName,
  typeCode,
  questions,
  practicedIds,
  favoriteIds,
  streakDays,
  weighting,
}: {
  skill: string;
  typeId: string;
  typeName: string;
  typeCode: string;
  questions: PracticeQuestionItem[];
  practicedIds: string[];
  favoriteIds: string[];
  streakDays: number;
  weighting: QuestionTypeWeighting | null;
}) {
  const practicedSet = useMemo(() => new Set(practicedIds), [practicedIds]);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const [filter, setFilter] = useState<"all" | "done" | "todo" | "favorite">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState(questions[0]?.id ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function changeFilter(next: "all" | "done" | "todo" | "favorite") {
    setFilter(next);
    // Đổi filter thì luôn nhảy về câu đầu tiên khớp filter đó, kể cả khi câu
    // đang chọn vẫn khớp — tránh gây khó hiểu khi bảng xem trước không đổi.
    const matchesFilter = (id: string) => {
      if (next === "done") return practicedSet.has(id);
      if (next === "todo") return !practicedSet.has(id);
      if (next === "favorite") return favoriteSet.has(id);
      return true;
    };
    setSelectedId((prevId) => {
      const firstMatch = questions.find((q) => matchesFilter(q.id));
      return firstMatch ? firstMatch.id : prevId;
    });
  }

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const filtered = questions.filter((q) => {
    if (filter === "done" && !practicedSet.has(q.id)) return false;
    if (filter === "todo" && practicedSet.has(q.id)) return false;
    if (filter === "favorite" && !favoriteSet.has(q.id)) return false;
    if (searchQuery.trim() && !q.excerpt.toLowerCase().includes(searchQuery.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const selected = questions.find((q) => q.id === selectedId) ?? questions[0];
  const doneCount = questions.filter((q) => practicedSet.has(q.id)).length;
  const favoriteCount = questions.filter((q) => favoriteSet.has(q.id)).length;

  const skillWeights = SKILL_DISPLAY_ORDER.filter((s) => (weighting?.[s] ?? 0) > 0);
  const TypeIcon = TYPE_ICONS[typeId] ?? Eye;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-5 py-8 sm:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-[26px]">
            <TypeIcon className="size-6" style={{ color: SKILL_ACCENT_COLOR[skill as Skill] }} />
            {typeName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className="wfd-mono flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{ background: "#FFF1E0", color: "#C2410C" }}
            >
              🔥 {streakDays} ngày liên tiếp
            </span>
            <p className="text-sm" style={{ color: "var(--wfd-muted)" }}>
              {questions.length} câu đề tủ - Chọn câu hỏi để luyện tập
            </p>
          </div>
        </div>
        {typeId === "repeat-sentence" && (
          <div className="flex shrink-0 gap-2">
            <Link
              href="/practice/speaking/repeat-sentence/luyen-nghe"
              className="flex items-center gap-1.5 rounded-[10px] border border-[var(--wfd-red)] bg-white px-5 py-2 text-sm font-bold text-[var(--wfd-red)] transition-colors hover:bg-[var(--wfd-red)] hover:text-white"
            >
              <Headphones className="size-4" /> Luyện nghe
            </Link>
            {/* Trang trí, giống bản tham khảo — chưa gắn tính năng, làm sau */}
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-[10px] border border-[var(--wfd-secondary-border)] px-5 py-2 text-sm font-bold text-[var(--wfd-secondary-text)] transition-colors hover:bg-[var(--wfd-secondary-border)] hover:text-white"
            >
              <ClipboardCheck className="size-4" /> Test yourself
            </button>
          </div>
        )}
      </div>

      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex size-14 shrink-0 items-center justify-center rounded-2xl border text-center leading-tight font-extrabold ${
              typeCode.length > 4 ? "px-1 text-xs" : "text-lg"
            }`}
            style={{
              background: "var(--wfd-surface)",
              borderColor: SKILL_ACCENT_COLOR[skill as Skill],
              color: SKILL_ACCENT_COLOR[skill as Skill],
            }}
          >
            {typeCode}
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold">{typeName}</p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="wfd-mono flex flex-wrap items-center gap-x-2 rounded-lg px-3 py-1.5 text-xs font-bold"
                style={{ background: "var(--wfd-bg)", color: "var(--wfd-ink)" }}
              >
                <span style={{ color: "var(--wfd-muted-2)" }}>Score Weight</span>
                <span className="flex items-center gap-1" style={{ color: "var(--wfd-red-dark)" }}>
                  <Gauge className="size-3.5" /> Overall:{weighting?.overall ?? 0}%
                </span>
                {skillWeights.map((s) => {
                  const SkillIcon = SKILL_ICONS[s];
                  return (
                    <span key={s} className="flex items-center gap-1">
                      <SkillIcon className="size-3.5" /> {SKILL_LABELS[s]}:<span style={{ color: "var(--wfd-red-dark)" }}>{weighting?.[s] ?? 0}%</span>
                    </span>
                  );
                })}
              </span>
              <Link
                href={`/weighting?type=${typeId}#${typeId}`}
                className="text-xs font-semibold"
                style={{ color: "var(--wfd-red-dark)" }}
              >
                Xem bảng trọng số đầy đủ ↗
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-[160px]">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
                style={{ color: "var(--wfd-muted-2)" }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo từ..."
                className="w-full rounded-full border py-1.5 pr-2.5 pl-8 text-xs outline-none"
                style={{ borderColor: "var(--wfd-border)", background: "var(--wfd-surface)" }}
              />
            </div>
            <div className="flex gap-2">
              {(
                [
                  ["all", `Tất cả · ${questions.length}`],
                  ["done", `Đã luyện · ${doneCount}`],
                  ["todo", `Chưa luyện · ${questions.length - doneCount}`],
                  ["favorite", `⭐ Ưa thích · ${favoriteCount}`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeFilter(key)}
                  className="rounded-lg px-3.5 py-2 text-xs font-bold"
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
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold">Chọn câu hỏi</label>
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left"
                style={{ borderColor: "var(--wfd-border)", background: "var(--wfd-surface)" }}
              >
                {selected && <StatusBadge done={practicedSet.has(selected.id)} />}
                <span
                  className="wfd-mono shrink-0 text-sm font-bold"
                  style={{ color: "var(--wfd-muted-2)" }}
                >
                  Câu {selected ? questions.indexOf(selected) + 1 : 0}:
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  {selected ? firstWords(selected.excerpt) : ""}
                </span>
                {dropdownOpen ? (
                  <ChevronUp className="size-4 shrink-0" style={{ color: "var(--wfd-muted-2)" }} />
                ) : (
                  <ChevronDown className="size-4 shrink-0" style={{ color: "var(--wfd-muted-2)" }} />
                )}
              </button>

              {dropdownOpen && (
                <div
                  className="absolute top-full right-0 left-0 z-10 mt-2 max-h-[360px] overflow-y-auto rounded-2xl border shadow-lg"
                  style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
                >
                  {filtered.map((q) => {
                    const done = practicedSet.has(q.id);
                    const isSelected = q.id === selected?.id;
                    const num = questions.indexOf(q) + 1;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(q.id);
                          setDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0"
                        style={{
                          borderColor: "var(--wfd-border)",
                          background: isSelected ? "var(--wfd-red-tint)" : "transparent",
                        }}
                      >
                        {done ? (
                          <CheckCircle2
                            className="size-4 shrink-0"
                            style={{ color: "var(--wfd-green)" }}
                          />
                        ) : (
                          <Circle className="size-4 shrink-0" style={{ color: "var(--wfd-border)" }} />
                        )}
                        <span
                          className="wfd-mono shrink-0 text-xs font-bold"
                          style={{ color: "var(--wfd-muted-2)" }}
                        >
                          Câu {num}:
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{firstWords(q.excerpt)}</span>
                        <StatusBadge done={done} />
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="p-4 text-center text-sm" style={{ color: "var(--wfd-muted)" }}>
                      Không tìm thấy câu nào khớp.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div
              className="flex flex-col gap-4 rounded-2xl border border-dashed p-5"
              style={{ background: "var(--wfd-surface-2)", borderColor: "var(--wfd-border)" }}
            >
              <div className="flex items-center gap-1.5">
                <Eye className="size-4" style={{ color: "var(--wfd-muted-2)" }} />
                <p className="text-sm font-bold" style={{ color: "var(--wfd-muted-2)" }}>
                  Xem trước câu hỏi
                </p>
              </div>
              <p className="text-sm leading-relaxed">{selected.excerpt}</p>
              <div className="flex flex-col items-center gap-3 pt-2">
                <Link
                  href={`/practice/${skill}/${typeId}/${selected.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-[10px] px-6 py-2.5 text-sm font-bold"
                  style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
                >
                  {typeId === "repeat-sentence" && <Mic className="size-4" />} Bắt đầu luyện tập
                </Link>
                {typeId === "repeat-sentence" ? (
                  <p
                    className="flex items-center gap-1 text-center text-sm"
                    style={{ color: "var(--wfd-muted-2)" }}
                  >
                    <Headphones className="size-4 shrink-0" />
                    Nghe câu mẫu → Sau tiếng &quot;<strong className="font-bold">BEEP</strong>&quot; →
                    Đọc lại thật tự nhiên. Hệ thống chấm
                    điểm theo từng từ & độ trôi chảy
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: "var(--wfd-muted-2)" }}>
                    hoặc chọn câu khác từ danh sách bên trên
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
