"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw, List, ArrowUp, ArrowDown, Minus, Volume2 } from "lucide-react";
import { WfdBankCard, WfdPearsonCard } from "@/components/wfd/wfd-sidebar-cards";
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
  const correctCount = diff.filter((d) => d.status === "correct").length;
  const total = diff.length;
  const grammarOk = checkCapitalizationAndPeriod(submittedAnswer);
  const ringPct = Math.min(100, (result.pteScore / 90) * 100);
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
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <p
                className="text-[11px] font-bold tracking-wide uppercase"
                style={{ color: "var(--wfd-muted-2)" }}
              >
                Điểm của bạn
              </p>
              <div
                className="relative flex size-[100px] items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(var(--wfd-red) 0% ${ringPct}%, var(--wfd-border) ${ringPct}% 100%)`,
                }}
              >
                <div
                  className="flex size-[78px] items-center justify-center rounded-full"
                  style={{ background: "var(--wfd-surface)" }}
                >
                  <span className="wfd-mono text-lg font-bold">
                    {result.pteScore}
                    <span style={{ opacity: 0.5 }}>/90</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex min-w-[200px] flex-1 flex-col gap-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold">
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
                      background: "var(--wfd-red)",
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Chính tả &amp; ngữ pháp</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                  style={{
                    background: grammarOk ? "var(--wfd-green-tint)" : "var(--wfd-red-tint)",
                    color: grammarOk ? "var(--wfd-green)" : "var(--wfd-red-dark)",
                  }}
                >
                  {grammarOk ? "Đạt" : "Chưa đạt"}
                </span>
              </div>
              {delta !== null && (
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>So với lần trước</span>
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
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
                  className="text-[11px] font-bold tracking-wide uppercase"
                  style={{ color: "var(--wfd-muted-2)" }}
                >
                  Đáp án gốc
                </p>
                <button
                  type="button"
                  onClick={handlePlayReference}
                  disabled={isPlayingRef}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold disabled:opacity-60"
                  style={{ background: "var(--wfd-red-tint)", color: "var(--wfd-red-dark)" }}
                >
                  <Volume2 className="size-3.5" /> {isPlayingRef ? "Đang phát..." : "Nghe lại"}
                </button>
              </div>
              <p className="text-[17px] leading-[1.9]">{referenceSentence}</p>
            </div>
            <div>
              <p
                className="mb-1 text-[11px] font-bold tracking-wide uppercase"
                style={{ color: "var(--wfd-muted-2)" }}
              >
                Bạn đã viết
              </p>
              <p className="flex flex-wrap gap-x-1 text-[17px] leading-[1.9]">
                {diff.map((d, i) => (
                  <span
                    key={i}
                    style={
                      d.status === "wrong"
                        ? { borderBottom: "2px dashed var(--wfd-red)", color: "var(--wfd-red-dark)" }
                        : d.status === "missing"
                          ? {
                              borderBottom: "2px dashed var(--wfd-black-sem)",
                              color: "var(--wfd-muted-2)",
                            }
                          : undefined
                    }
                  >
                    {d.status === "missing" ? "___" : (userWords[i] ?? d.word)}
                  </span>
                ))}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs font-semibold">
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
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl border p-6"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          <p className="mb-3 text-sm font-bold">Phân tích từng từ</p>
          <div className="flex flex-wrap gap-2">
            {diff.map((d, i) => (
              <span
                key={i}
                className="rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                style={{
                  color:
                    d.status === "correct"
                      ? "var(--wfd-green)"
                      : d.status === "wrong"
                        ? "var(--wfd-red-dark)"
                        : "var(--wfd-black-sem)",
                  background:
                    d.status === "correct"
                      ? "var(--wfd-green-tint)"
                      : d.status === "wrong"
                        ? "var(--wfd-red-tint)"
                        : "var(--wfd-black-tint)",
                }}
              >
                {d.word}
                {d.status !== "correct" && (
                  <span style={{ opacity: 0.75, fontWeight: 500 }}>
                    {" "}
                    ({d.status === "wrong" ? "sai" : "thiếu"})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl p-4 text-sm leading-relaxed"
          style={{ background: "var(--wfd-navy-tint-2)", color: "var(--wfd-navy)" }}
        >
          💡 <strong>Ghi nhớ:</strong> PTE luôn yêu cầu viết hoa chữ cái đầu câu và kết
          thúc bằng dấu chấm để tính điểm nội dung tối đa.
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={listHref}
            className="flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "var(--wfd-muted)" }}
          >
            <List className="size-4" /> Danh sách câu hỏi
          </Link>
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 rounded-[10px] border px-5 py-2.5 text-sm font-semibold"
            style={{ borderColor: "var(--wfd-secondary-border)", color: "var(--wfd-secondary-text)" }}
          >
            <RotateCcw className="size-4" /> Làm lại câu này
          </button>
          {nextHref ? (
            <Link
              href={nextHref}
              className="flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-sm font-bold"
              style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
            >
              Câu tiếp theo <ArrowRight className="size-4" />
            </Link>
          ) : (
            <span
              className="pointer-events-none flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-sm font-bold opacity-50"
              style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
            >
              Câu tiếp theo <ArrowRight className="size-4" />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <WfdBankCard
          typeName="Write From Dictation"
          title="Về dạng bài WFD"
          description="Write From Dictation chiếm khoảng 5% Overall, 13% Listening và 23% Writing. Đây là dạng bài dễ ăn điểm nhất nếu luyện tập đều đặn — chỉ cần nghe kỹ và gõ đúng thứ tự từ."
        />
        <WfdPearsonCard />
      </div>
    </div>
  );
}
