"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, List, ArrowUp, ArrowDown, Minus, Volume2 } from "lucide-react";
import { ExamSimulationToggle } from "@/components/practice/exam-simulation-toggle";
import { fetchAzureTts, isBrowserTtsSupported, speakWithBrowserTts } from "@/lib/wfd-tts-client";
import type { ScoreResult } from "@/lib/scoring/types";
import type { DictationWordDiff } from "@/lib/scoring/rule-based";

function checkCapitalizationAndPeriod(answer: string): boolean {
  const trimmed = answer.trim();
  if (!trimmed) return false;
  return /^[A-Z]/.test(trimmed) && /\.$/.test(trimmed);
}

export function WfdResultScreen({
  result,
  submittedAnswer,
  referenceSentence,
  listHref,
  nextHref,
  previousPteScore,
  onRetry,
}: {
  result: ScoreResult;
  submittedAnswer: string;
  referenceSentence: string;
  listHref: string;
  nextHref: string | null;
  previousPteScore: number | null;
  onRetry: () => void;
}) {
  const diff = result.reveal.diff as DictationWordDiff[];
  const refDiff = diff.filter((d) => d.status !== "extra");
  const correctCount = refDiff.filter(
    (d) => d.status === "correct" || d.status === "wrong-case"
  ).length;
  const total = refDiff.length;
  const grammarOk = checkCapitalizationAndPeriod(submittedAnswer);
  const userWords = submittedAnswer.trim().length ? submittedAnswer.trim().split(/\s+/) : [];
  const delta = previousPteScore != null ? result.pteScore - previousPteScore : null;

  const [isPlayingRef, setIsPlayingRef] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      window.speechSynthesis?.cancel();
    };
  }, []);

  async function handlePlayReference() {
    if (isPlayingRef) return;
    setIsPlayingRef(true);

    const azure = await fetchAzureTts(referenceSentence);
    if (azure) {
      const audio = new Audio(azure.url);
      audioRef.current = audio;
      audio.onended = () => setIsPlayingRef(false);
      audio.onerror = () => setIsPlayingRef(false);
      audio.play();
      return;
    }

    if (!isBrowserTtsSupported()) {
      setIsPlayingRef(false);
      return;
    }
    speakWithBrowserTts(referenceSentence, () => setIsPlayingRef(false));
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <p
                className="text-xs font-bold tracking-wide uppercase"
                style={{ color: "var(--wfd-muted-2)" }}
              >
                Điểm của bạn
              </p>
              <div className="flex flex-col items-center">
                <span
                  className="text-4xl font-extrabold"
                  style={{ color: result.pteScore >= 30 ? "var(--wfd-green)" : "var(--wfd-red-dark)" }}
                >
                  {result.pteScore}
                </span>
                <span className="text-[13px]" style={{ color: "var(--wfd-muted)" }}>
                  / 90 điểm
                </span>
              </div>
            </div>
            <div className="flex min-w-[200px] flex-1 flex-col gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-[13px] font-semibold">
                  <span>Từ đúng</span>
                  <span className="wfd-mono">
                    {correctCount}/{total}
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "var(--wfd-border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${total ? (correctCount / total) * 100 : 0}%`,
                      background: total && correctCount / total > 0.3 ? "var(--wfd-green)" : "var(--wfd-red)",
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-[13px] font-semibold">
                <span>Chính tả &amp; ngữ pháp</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{
                    background: grammarOk ? "var(--wfd-green-tint)" : "var(--wfd-red-tint)",
                    color: grammarOk ? "var(--wfd-green)" : "var(--wfd-red-dark)",
                  }}
                >
                  {grammarOk ? "Đạt" : "Chưa đạt"}
                </span>
              </div>
              {delta !== null && (
                <div className="flex items-center justify-between text-[13px] font-semibold">
                  <span>So với lần trước</span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{
                      background:
                        delta > 0
                          ? "var(--wfd-green-tint)"
                          : delta < 0
                            ? "var(--wfd-red-tint)"
                            : "var(--wfd-code-bg)",
                      color:
                        delta > 0
                          ? "var(--wfd-green)"
                          : delta < 0
                            ? "var(--wfd-red-dark)"
                            : "var(--wfd-muted)",
                    }}
                  >
                    {delta > 0 ? (
                      <ArrowUp className="size-3" />
                    ) : delta < 0 ? (
                      <ArrowDown className="size-3" />
                    ) : (
                      <Minus className="size-3" />
                    )}
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          <div className="flex flex-col gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p
                  className="text-xs font-bold tracking-wide uppercase"
                  style={{ color: "var(--wfd-muted-2)" }}
                >
                  Đáp án chuẩn
                </p>
                <button
                  type="button"
                  onClick={handlePlayReference}
                  disabled={isPlayingRef}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold disabled:opacity-60"
                  style={{ background: "var(--wfd-red-tint)", color: "var(--wfd-red-dark)" }}
                >
                  <Volume2 className="size-3.5" /> {isPlayingRef ? "Đang phát..." : "Nghe lại"}
                </button>
              </div>
              <p className="font-passage text-[17px] leading-[1.9]">{referenceSentence}</p>
            </div>
            <div>
              <p
                className="mb-1 text-xs font-bold tracking-wide uppercase"
                style={{ color: "var(--wfd-muted-2)" }}
              >
                Bài làm của bạn
              </p>
              <p className="font-passage flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[17px] leading-[1.9]">
                {diff.map((d, i) => {
                  const userWord = userWords[i] ?? d.userWord;
                  if (d.status === "correct") {
                    return (
                      <span key={i} style={{ color: "var(--wfd-green)" }}>
                        {userWord ?? d.word}
                      </span>
                    );
                  }
                  if (d.status === "wrong") {
                    return (
                      <span key={i} className="inline-flex items-baseline gap-1">
                        <span style={{ color: "var(--wfd-red-dark)", textDecoration: "line-through" }}>
                          {userWord}
                        </span>
                        <span
                          style={{
                            borderBottom: "2px dashed var(--wfd-red)",
                            color: "var(--wfd-red-dark)",
                            fontWeight: 600,
                          }}
                        >
                          [{d.word}]
                        </span>
                      </span>
                    );
                  }
                  if (d.status === "missing") {
                    return (
                      <span
                        key={i}
                        style={{
                          borderBottom: "2px dashed var(--wfd-red)",
                          color: "var(--wfd-red-dark)",
                          fontWeight: 600,
                        }}
                      >
                        [{d.word}]
                      </span>
                    );
                  }
                  if (d.status === "wrong-case") {
                    return (
                      <span key={i} className="inline-flex items-baseline gap-1">
                        <span
                          style={{
                            borderBottom: "2px dotted var(--wfd-amber)",
                            color: "var(--wfd-amber)",
                          }}
                        >
                          {userWord}
                        </span>
                        <span className="text-[15px] italic" style={{ color: "var(--wfd-muted-2)" }}>
                          ({d.word})
                        </span>
                      </span>
                    );
                  }
                  // extra
                  return (
                    <span
                      key={i}
                      style={{ borderBottom: "2px dotted var(--wfd-muted-2)", color: "var(--wfd-muted-2)" }}
                    >
                      {userWord ?? d.word}
                    </span>
                  );
                })}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: "var(--wfd-green)" }} />
                Từ đúng
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: "var(--wfd-red)" }} />
                Sai
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: "var(--wfd-black-sem)" }} />
                Thiếu
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: "var(--wfd-amber)" }} />
                Sai định dạng (viết hoa)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: "var(--wfd-muted-2)" }} />
                Từ thừa (không trừ điểm)
              </span>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          <p className="mb-3 text-[15px] font-bold">Phân tích từng từ</p>
          <div className="flex flex-wrap gap-2">
            {diff.map((d, i) => (
              <span
                key={i}
                className="rounded-lg px-3 py-1.5 text-[14px] font-semibold"
                style={{
                  color:
                    d.status === "correct"
                      ? "var(--wfd-green)"
                      : d.status === "wrong"
                        ? "var(--wfd-red-dark)"
                        : d.status === "wrong-case"
                          ? "var(--wfd-amber)"
                          : d.status === "extra"
                            ? "var(--wfd-muted-2)"
                            : "var(--wfd-black-sem)",
                  background:
                    d.status === "correct"
                      ? "var(--wfd-green-tint)"
                      : d.status === "wrong"
                        ? "var(--wfd-red-tint)"
                        : d.status === "wrong-case"
                          ? "var(--wfd-amber-tint)"
                          : d.status === "extra"
                            ? "var(--wfd-code-bg)"
                            : "var(--wfd-black-tint)",
                }}
              >
                {d.word}
                {d.status !== "correct" && (
                  <span style={{ opacity: 0.75, fontWeight: 500 }}>
                    {" "}
                    (
                    {d.status === "wrong"
                      ? "sai"
                      : d.status === "missing"
                        ? "thiếu"
                        : d.status === "wrong-case"
                          ? "sai định dạng"
                          : "thừa"}
                    )
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl p-4 text-[15px] leading-relaxed"
          style={{ background: "var(--wfd-navy-tint-2)", color: "var(--wfd-navy)" }}
        >
          💡 <strong>Ghi nhớ:</strong> PTE luôn yêu cầu viết hoa chữ cái đầu câu và kết
          thúc bằng dấu chấm để tính điểm nội dung tối đa.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={listHref}
            className="flex items-center gap-1.5 text-[15px] font-semibold"
            style={{ color: "var(--wfd-muted)" }}
          >
            <List className="size-4" /> Danh sách câu hỏi
          </Link>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-[10px] border px-5 py-2.5 text-[15px] font-semibold"
            style={{ borderColor: "var(--wfd-secondary-border)", color: "var(--wfd-secondary-text)" }}
          >
            <RotateCcw className="size-4" /> Làm lại câu này
          </button>
          {nextHref ? (
            <Link
              href={nextHref}
              className="flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-[15px] font-bold"
              style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
            >
              Câu tiếp theo <ArrowRight className="size-4" />
            </Link>
          ) : (
            <span
              className="pointer-events-none flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-[15px] font-bold opacity-50"
              style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
            >
              Câu tiếp theo <ArrowRight className="size-4" />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <ExamSimulationToggle questionTypeId="write-from-dictation" />
      </div>
    </div>
  );
}
