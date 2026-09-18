"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { WfdAudioCard } from "@/components/wfd/wfd-audio-card";
import { WfdBankCard, WfdTipsCard, WfdPearsonCard } from "@/components/wfd/wfd-sidebar-cards";
import { WfdResultScreen } from "@/components/wfd/wfd-result-screen";
import { submitAttemptAction, getPreviousAttemptScore } from "@/lib/actions/practice";
import type { ScoreResult } from "@/lib/scoring/types";

export function WfdPlayScreen({
  questionId,
  sentence,
  prevHref,
  nextHref,
  listHref,
  streakDays,
  questionNumber,
}: {
  questionId: string;
  sentence: string;
  prevHref: string | null;
  nextHref: string | null;
  listHref: string;
  streakDays: number;
  questionNumber: number;
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
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-8 px-5 py-8 sm:px-10 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={listHref}
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
              Câu #{questionNumber}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold sm:text-[26px]">
            Nghe đoạn ghi âm và gõ lại chính xác câu bạn vừa nghe
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm" style={{ color: "var(--wfd-muted)" }}>
            <span
              className="wfd-mono rounded-md border px-1.5 py-0.5 text-xs font-bold"
              style={{ borderColor: "#0d9488", color: "#0d9488" }}
            >
              WFD
            </span>
            Write From Dictation — nghe 1 lần duy nhất, viết lại đầy đủ và chính xác
          </p>
        </div>

        <WfdAudioCard sentence={sentence} questionId={questionId} onPlayed={() => setHasPlayed(true)} />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold" htmlFor="wfd-answer">
            Nhập câu trả lời của bạn
          </label>
          <textarea
            id="wfd-answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Gõ lại chính xác câu bạn vừa nghe được... (Viết hoa chữ cái đầu và kết thúc bằng dấu chấm)"
            className="min-h-[132px] resize-y rounded-xl border p-3 text-sm outline-none"
            style={{
              background: "var(--wfd-surface)",
              borderColor: "var(--wfd-border)",
              color: "var(--wfd-ink)",
            }}
          />
          <div className="flex justify-end">
            <span className="wfd-mono text-xs" style={{ color: "var(--wfd-muted-2)" }}>
              Số từ: {wordCount}
            </span>
          </div>
        </div>

        {showHint && firstWord && (
          <p className="text-xs" style={{ color: "var(--wfd-muted)" }}>
            Gợi ý: câu bắt đầu bằng từ &quot;{firstWord}&quot;
          </p>
        )}

        <div
          className="rounded-xl p-4 text-sm leading-relaxed"
          style={{ background: "var(--wfd-navy-tint-2)", color: "var(--wfd-navy)" }}
        >
          💡 <strong>Cách chấm điểm:</strong> Mỗi từ đúng vị trí được 1 điểm, từ thừa
          không bị trừ điểm. Hệ thống tự động chuẩn hoá chữ hoa/thường và dấu câu
          trước khi so khớp với đáp án gốc.
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowHint(true)}
            disabled={!hasPlayed}
            className="rounded-[10px] border px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: "var(--wfd-border)", color: "var(--wfd-navy)" }}
          >
            Gợi ý
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasPlayed || answer.trim().length === 0 || isSubmitting}
            className="flex items-center gap-2 rounded-[10px] px-6 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ background: "var(--brand-accent)", color: "var(--brand-accent-foreground)" }}
          >
            {isSubmitting ? "Đang chấm..." : "Nộp bài"} <ArrowRight className="size-4" />
          </button>
        </div>
        {error && (
          <p className="text-sm" style={{ color: "var(--wfd-red-dark)" }}>
            {error}
          </p>
        )}

        <div
          className="flex items-center justify-between border-t pt-4"
          style={{ borderColor: "var(--wfd-border)" }}
        >
          {prevHref ? (
            <Link
              href={prevHref}
              className="flex items-center gap-1 text-sm font-semibold"
              style={{ color: "var(--wfd-muted)" }}
            >
              <ChevronLeft className="size-4" /> Câu trước
            </Link>
          ) : (
            <span />
          )}
          {nextHref ? (
            <Link
              href={nextHref}
              className="flex items-center gap-1 text-sm font-semibold"
              style={{ color: "var(--wfd-muted)" }}
            >
              Câu sau <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <WfdBankCard
          typeName="Write From Dictation"
          title="Về dạng bài WFD"
          description="Write From Dictation chiếm khoảng 5% Overall, 13% Listening và 23% Writing. Đây là dạng bài dễ ăn điểm nhất nếu luyện tập đều đặn — chỉ cần nghe kỹ và gõ đúng thứ tự từ."
        />
        <WfdTipsCard
          tips={[
            "Ghi chú nhanh các từ khoá (danh từ, động từ) ngay khi nghe, chưa cần đúng chính tả.",
            "Ưu tiên đúng thứ tự từ hơn là cố nhớ đúng từng chữ cái.",
            "Đừng bỏ sót mạo từ (a, an, the) và giới từ ngắn — rất dễ mất điểm.",
            "Viết hoa chữ cái đầu câu và thêm dấu chấm cuối câu.",
            "Nếu không chắc chính tả, cứ viết theo cách phát âm rồi rà lại trước khi nộp.",
          ]}
        />
        <WfdPearsonCard />
      </div>
    </div>
  );
}
