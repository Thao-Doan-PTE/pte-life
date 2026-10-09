"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { WfdAudioCard } from "@/components/wfd/wfd-audio-card";
import { WfdTipsCard } from "@/components/wfd/wfd-sidebar-cards";
import { ExamSimulationToggle } from "@/components/practice/exam-simulation-toggle";
import { WfdResultScreen } from "@/components/wfd/wfd-result-screen";
import { submitAttemptAction, getPreviousAttemptScore } from "@/lib/actions/practice";
import { FavoriteStarButton } from "@/components/practice/favorite-star-button";
import { DifficultyBadge } from "@/components/practice/difficulty-badge";
import { SKILL_ACCENT_COLOR } from "@/lib/question-types";
import { classifyDifficulty } from "@/lib/difficulty";
import type { ScoreResult } from "@/lib/scoring/types";

export function WfdPlayScreen({
  questionId,
  questionCode,
  sentence,
  prevHref,
  nextHref,
  listHref,
  questionNumber,
  total,
  isFavorited,
}: {
  questionId: string;
  questionCode: string;
  sentence: string;
  prevHref: string | null;
  nextHref: string | null;
  listHref: string;
  questionNumber: number;
  total: number;
  isFavorited: boolean;
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState("");
  const [previousPteScore, setPreviousPteScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startedAtRef = useRef(0);
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const wordCount = answer.trim().length === 0 ? 0 : answer.trim().split(/\s+/).length;
  const firstWord = sentence.trim().split(/\s+/)[0]?.replace(/[.,!?;:]/g, "");
  const difficulty = classifyDifficulty("write-from-dictation", sentence);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const previousScore = await getPreviousAttemptScore(questionId);
      const elapsedSec = Math.round((Date.now() - startedAtRef.current) / 1000);
      const res = await submitAttemptAction(questionId, answer, elapsedSec);
      setSubmittedAnswer(answer);
      setPreviousPteScore(previousScore);
      setResult(res);
    } catch {
      setError("Không thể chấm điểm, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <WfdResultScreen
        result={result}
        submittedAnswer={submittedAnswer}
        referenceSentence={sentence}
        listHref={listHref}
        nextHref={nextHref}
        previousPteScore={previousPteScore}
        onRetry={() => {
          setResult(null);
          setSubmittedAnswer("");
          setPreviousPteScore(null);
          setAnswer("");
          setHasPlayed(false);
          setShowHint(false);
        }}
      />
    );
  }

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={listHref}
            className="flex items-center gap-1 text-[15px] font-normal"
            style={{ color: "var(--wfd-muted)" }}
          >
            <ArrowLeft className="size-4" /> Danh sách câu hỏi
          </Link>
          <span
            className="wfd-mono rounded-full px-3 py-1 text-[13px] font-bold"
            style={{ background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
          >
            Câu {questionNumber} / {total}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-lg text-[17px] font-extrabold text-white"
            style={{ background: SKILL_ACCENT_COLOR.listening }}
          >
            WFD
          </div>
          <h1 className="text-2xl font-bold sm:text-2xl">Write From Dictation</h1>
        </div>

        <div
          className="flex items-start gap-2.5 rounded-lg border-t-2 px-4 py-3 text-[15px] font-medium"
          style={{ borderColor: "#f59e0b", background: "var(--wfd-code-bg)", color: "var(--wfd-ink)" }}
        >
          <Headphones className="mt-0.5 size-4 shrink-0" style={{ color: "#f59e0b" }} />
          <p>Nghe đoạn ghi âm và gõ lại chính xác câu bạn vừa nghe — nghe 1 lần duy nhất, viết lại đầy đủ và chính xác.</p>
        </div>

        <div
          className="flex flex-col gap-4 rounded-2xl border p-5"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4" style={{ borderColor: "var(--wfd-border)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="wfd-mono rounded-full px-3 py-1 text-[13px] font-bold"
                style={{ background: "var(--wfd-black-tint)", color: "var(--wfd-ink)" }}
              >
                #{questionCode}
              </span>
              <DifficultyBadge level={difficulty} />
            </div>
            <FavoriteStarButton questionId={questionId} initialFavorited={isFavorited} />
          </div>

          <WfdAudioCard sentence={sentence} onPlayed={() => setHasPlayed(true)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-[15px] font-semibold" htmlFor="wfd-answer">
              Nhập câu trả lời của bạn
            </label>
            <textarea
              id="wfd-answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Gõ lại chính xác câu bạn vừa nghe được... (Viết hoa chữ cái đầu và kết thúc bằng dấu chấm)"
              className="font-passage min-h-[132px] resize-y rounded-xl border p-3 text-[17px] leading-relaxed outline-none"
              style={{
                background: "var(--wfd-bg)",
                borderColor: "var(--wfd-border)",
                color: "var(--wfd-ink)",
              }}
            />
            <div className="flex justify-end">
              <span className="wfd-mono text-[13px]" style={{ color: "var(--wfd-muted-2)" }}>
                Số từ: {wordCount}
              </span>
            </div>
          </div>

          {showHint && firstWord && (
            <p className="text-[13px]" style={{ color: "var(--wfd-muted)" }}>
              Gợi ý: câu bắt đầu bằng từ &quot;{firstWord}&quot;
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowHint(true)}
              disabled={!hasPlayed}
              className="rounded-[10px] border px-5 py-2.5 text-[15px] font-semibold disabled:opacity-50"
              style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-navy)" }}
            >
              Gợi ý
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={answer.trim().length === 0 || isSubmitting}
              className="flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-[15px] font-bold disabled:opacity-50"
              style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
            >
              {isSubmitting ? "Đang chấm..." : "Nộp bài"} <ArrowRight className="size-4" />
            </button>
          </div>
          {error && (
            <p className="text-[15px]" style={{ color: "var(--wfd-red-dark)" }}>
              {error}
            </p>
          )}
        </div>

        <div
          className="rounded-xl p-4 text-[13px] leading-relaxed"
          style={{ background: "var(--wfd-navy-tint-2)", color: "var(--wfd-navy)" }}
        >
          ** <strong>Lưu ý:</strong> Mỗi từ đúng vị trí được 1 điểm, từ thừa không bị
          trừ điểm. Kiểm tra kỹ lỗi gõ/ngữ pháp trước khi nộp bài!
        </div>

        <div
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: "var(--wfd-border)" }}
        >
          {prevHref ? (
            <Link
              href={prevHref}
              className="flex items-center gap-1 rounded-lg border px-4 py-2 text-[15px] font-semibold transition-colors hover:bg-[var(--wfd-bg)]"
              style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-muted)", background: "var(--wfd-surface)" }}
            >
              <ChevronLeft className="size-4" /> Câu trước
            </Link>
          ) : (
            <span />
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className="flex items-center gap-1 rounded-lg border px-4 py-2 text-[15px] font-semibold transition-colors hover:bg-[var(--wfd-bg)]"
              style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-muted)", background: "var(--wfd-surface)" }}
            >
              Câu tiếp theo <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <ExamSimulationToggle questionTypeId="write-from-dictation" />
        <WfdTipsCard
          title="MẸO LÀM BÀI WFD"
          tips={[
            <span key="1">
              <b>Ghi nháp chữ cái đầu:</b> Dùng bảng, giấy nháp viết nhanh ký tự đầu từng từ khi nghe.
            </span>,
            <span key="2">
              <b>Chú ý từ nhỏ & âm đuôi:</b> Chấm điểm theo từ đúng; nghe kỹ mạo từ, giới từ, đuôi -s/-es/-ed.
            </span>,
            <span key="3">
              <b>Thống nhất chính tả:</b> Gõ toàn bộ câu theo duy nhất một chuẩn tiếng Anh (Anh - Anh hoặc Anh - Mỹ).
            </span>,
          ]}
        />
        <div
          className="flex flex-col gap-1 rounded-xl border p-4"
          style={{ background: "var(--wfd-surface)", borderColor: "var(--wfd-border)" }}
        >
          <p className="text-[13px] font-semibold">Phím tắt</p>
          <p className="flex items-center gap-1.5 text-[13px]" style={{ color: "var(--wfd-muted)" }}>
            <span
              className="wfd-mono rounded-md border px-1.5 py-0.5 text-[13px]"
              style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-ink)" }}
            >
              Space
            </span>
            Phát / nghe lại câu
          </p>
          <p className="text-[13px]" style={{ color: "var(--wfd-muted)" }}>
            Bôi đen hoặc nhấp đúp một từ để tra nghĩa.
          </p>
        </div>
      </div>
    </div>
  );
}
