"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, FileText, Info, Loader2, Mic } from "lucide-react";
import {
  ENTRY_TEST_DURATION_MINUTES,
  ENTRY_TEST_SECTIONS,
  getAllEntryTestQuestions,
  type ReadAloudQuestion,
} from "@/lib/entry-test-data";
import { gradeEntryTestAttempt, gradeEntryTestQuestion } from "@/lib/entry-test-grading";
import { submitEntryTestAttemptAction } from "@/lib/actions/entry-test-attempt";
import type { EntryTestReviewRow } from "@/lib/entry-test-queries";
import { EntryTestSpeaking } from "@/components/entry-test/entry-test-speaking";
import { EntryTestWordSection, EntryTestReadingSection, EntryTestListeningSection } from "@/components/entry-test/entry-test-sections";
import { EntryTestResult } from "@/components/entry-test/entry-test-result";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Phase = "intro" | "test" | "submitting" | "result";

/** Trang dùng RailShell fullBleed nên các giai đoạn làm bài/kết quả tự tạo khoảng đệm và nền kem như các trang khác. */
const PAGE_PAD = "min-h-full px-6 py-10 sm:px-8 sm:py-12";

export function EntryTestShell({ attemptId, defaultName, defaultEmail }: { attemptId: string; defaultName?: string; defaultEmail?: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [listenPlays, setListenPlays] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ENTRY_TEST_DURATION_MINUTES * 60);
  const [confirm, setConfirm] = useState<{ title: string; text: string; onConfirm: () => void } | null>(null);
  const [result, setResult] = useState<{ rows: EntryTestReviewRow[]; autoSubmitted: boolean; durationUsedSec: number } | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "test") return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          void handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function updateAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function countBlank(): number {
    let n = ENTRY_TEST_SECTIONS.slice(1).reduce(
      (acc, s) => acc + s.items.filter((q) => !(answers[q.id] ?? "").trim()).length,
      0
    );
    if (!audioUrl) n += 1;
    return n;
  }

  async function handleSubmit(autoSubmitted: boolean) {
    setPhase("submitting");
    const res = await submitEntryTestAttemptAction(attemptId, answers, autoSubmitted);
    const durationUsedSec = startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : ENTRY_TEST_DURATION_MINUTES * 60 - secondsLeft;
    if (res.ok && res.summary) {
      const rows: EntryTestReviewRow[] = getAllEntryTestQuestions().map((q) => {
        const section = ENTRY_TEST_SECTIONS.find((s) => s.items.includes(q))!;
        const sectionResult = res.summary!.sections.find((s) => s.key === section.key)!;
        const answerDisplay = q.type === "read_aloud" ? null : "answer" in q ? (Array.isArray(q.answer) ? (q.answer[0] ?? null) : (q.answer ?? null)) : null;
        return {
          questionId: q.id,
          sectionName: section.name,
          responseText: q.id === "S1" ? null : (answers[q.id] ?? null),
          audioUrl: q.id === "S1" ? audioUrl : null,
          answerDisplay,
          pointsAwarded: q.id === "S1" ? null : gradeEntryTestQuestion(q, answers[q.id]),
          pointsMax: q.points,
          pending: sectionResult.pending,
        };
      });
      setResult({ rows, autoSubmitted, durationUsedSec });
      setPhase("result");
    } else {
      setConfirm({
        title: "Không thể nộp bài",
        text: res.error ?? "Có lỗi xảy ra, vui lòng thử lại.",
        onConfirm: () => setPhase("test"),
      });
      setPhase("test");
    }
  }

  function goToStep(i: number) {
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleNext() {
    if (step === 0 && !audioUrl) {
      setConfirm({
        title: "Bạn chưa hoàn thành bài ghi âm Speaking!",
        text: "Bạn muốn chuyển sang kỹ năng tiếp theo?",
        onConfirm: () => goToStep(1),
      });
      return;
    }
    goToStep(step + 1);
  }

  function handleSubmitClick() {
    const blank = countBlank();
    setConfirm({
      title: "Nộp bài?",
      text: blank ? `Bạn còn ${blank} câu chưa trả lời. Bài nộp rồi sẽ không sửa được.` : "Bài nộp rồi sẽ không sửa được.",
      onConfirm: () => void handleSubmit(false),
    });
  }

  if (phase === "intro") {
    return (
      <div className="w-full" style={{ background: "var(--rail-bg)" }}>
        <div className="relative px-6 py-9 sm:min-h-[200px] sm:px-10 sm:py-12" style={{ background: "var(--rail-red-hover)" }}>
          <div className="max-w-[58%] sm:max-w-[55%]">
            <h2 className="m-0 mb-3 text-[clamp(28px,3.8vw,48px)] leading-[1.1] font-bold text-white">Test đầu vào PTE</h2>
            <p className="m-0 text-[17px] text-white/90 sm:text-2xl">Nhận kết quả và đánh giá chuẩn năng lực</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- ảnh tĩnh trong public, không cần tối ưu qua next/image */}
          <img
            src="/images/test-dau-vao-banner.webp"
            alt="Giáo viên PTE-Life"
            className="pointer-events-none absolute right-6 bottom-0 h-[92%] w-auto max-w-[45%] object-contain object-bottom sm:right-[16%]"
          />
        </div>

        <div className="flex flex-col gap-5 px-6 py-8 sm:px-10">
          <p className="m-0 max-w-[75ch] text-[16px] leading-relaxed" style={{ color: "var(--rail-ink-dim)" }}>
            Bài kiểm tra 4 kỹ năng giúp PTE-Life xác định trình độ hiện tại và gợi ý lộ trình phù hợp. Làm liền một
            lượt, hệ thống tự nộp khi hết giờ.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { k: "Thời gian", v: "5 - 40 phút", Icon: Clock },
              { k: "Số câu", v: "26 câu · 4 phần", Icon: FileText },
              { k: "Cần chuẩn bị", v: "Micro + Tai nghe", Icon: Mic },
            ].map(({ k, v, Icon }) => (
              <div key={k} className="rounded-lg p-4" style={{ background: "var(--rail-bg)", boxShadow: "0 4px 16px rgba(43,33,32,.12), 0 1px 3px rgba(43,33,32,.08)" }}>
                <p className="m-0 flex items-center gap-1.5 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
                  <Icon className="size-3.5" /> {k}
                </p>
                <p className="m-0 mt-1.5 text-[17px] font-semibold" style={{ color: "var(--rail-charcoal)" }}>
                  {v}
                </p>
              </div>
            ))}
          </div>

          <div
            className="flex items-start gap-2.5 border-l-4 p-4 text-[15px]"
            style={{
              borderColor: "var(--rail-warning)",
              background: "color-mix(in srgb, var(--rail-warning) 8%, white)",
              color: "var(--rail-ink)",
            }}
          >
            <Info className="mt-0.5 size-4 shrink-0" style={{ color: "var(--rail-warning)" }} />
            <p className="m-0">
              <b>Lưu ý:</b> Phần Speaking ghi âm trong 40 giây. Phần Listening chỉ nghe được tối đa 2 lần.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              startedAtRef.current = Date.now();
              setPhase("test");
            }}
            className="animate-cta-pulse flex w-fit items-center gap-2 rounded-lg px-6 py-3 text-[15px] font-bold text-white transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-[var(--rail-red-hover)] active:translate-y-0"
            style={{ background: "var(--rail-red)" }}
          >
            Làm bài test ngay <span className="animate-cta-nudge">→</span>
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result" && result) {
    const summary = gradeEntryTestAttempt(ENTRY_TEST_SECTIONS, answers);
    return (
      <div className={PAGE_PAD} style={{ background: "var(--rail-surface-card)" }}>
        <EntryTestResult
          summary={summary}
          rows={result.rows}
          autoSubmitted={result.autoSubmitted}
          durationUsedSec={result.durationUsedSec}
          defaultName={defaultName}
          defaultEmail={defaultEmail}
        />
      </div>
    );
  }

  const section = ENTRY_TEST_SECTIONS[step];

  return (
    <div className={PAGE_PAD} style={{ background: "var(--rail-bg)" }}>
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 rounded-lg p-5 sm:p-6" style={{ background: "var(--rail-bg)", boxShadow: "0 0 24px rgba(0,0,0,.09)" }}>
      <div className="sticky top-16 z-[5] -mx-5 flex items-center justify-between px-5 py-2 sm:-mx-6 sm:px-6" style={{ background: "var(--rail-bg)" }}>
        <span className="text-[15px] font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
          Test đầu vào PTE
        </span>
        <div
          className="flex items-center gap-1"
          role="timer"
          aria-label={`Còn lại ${formatClock(secondsLeft)}`}
        >
          {formatClock(secondsLeft)
            .split("")
            .map((ch, i) =>
              ch === ":" ? (
                <span key={i} className="px-0.5 text-[20px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                  :
                </span>
              ) : (
                <span
                  key={i}
                  className="grid size-8 place-items-center rounded-md text-[20px] font-bold tabular-nums text-white"
                  style={{ background: secondsLeft < 300 ? "var(--rail-red)" : "var(--rail-warning)" }}
                >
                  {ch}
                </span>
              )
            )}
        </div>
      </div>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Các phần thi">
        {ENTRY_TEST_SECTIONS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => goToStep(i)}
            className="flex items-center gap-2.5 rounded-lg p-2 text-left"
            style={{ background: i === step ? "#f7f2ec" : "transparent" }}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-md text-[15px] font-bold"
              style={
                i === step
                  ? { background: "var(--rail-red)", color: "var(--rail-cta-text)" }
                  : i < step
                    ? { background: "var(--rail-charcoal)", color: "var(--rail-on-charcoal)" }
                    : { background: "var(--rail-surface)", color: "var(--rail-ink-dim)" }
              }
            >
              {i < step ? <CheckCircle2 className="size-4" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold" style={{ color: "var(--rail-ink)" }}>
                {s.name}
              </span>
              <span className="block truncate text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
                {s.nameVi}
              </span>
            </span>
          </button>
        ))}
      </nav>

      <div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="m-0 text-[20px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
            {section.name} <span style={{ color: "var(--rail-red)" }}>({section.pointsLabel}đ)</span>
          </h2>
          <span className="text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
            {section.nameVi}
          </span>
        </div>

        {section.key === "speaking" && (
          <EntryTestSpeaking
            attemptId={attemptId}
            question={section.items[0] as ReadAloudQuestion}
            hasRecording={!!audioUrl}
            onRecorded={(url) => setAudioUrl(url)}
          />
        )}
        {section.key === "word" && <EntryTestWordSection section={section} answers={answers} onChange={updateAnswer} />}
        {section.key === "reading" && <EntryTestReadingSection section={section} answers={answers} onChange={updateAnswer} />}
        {section.key === "listening" && <EntryTestListeningSection
            section={section}
            answers={answers}
            onChange={updateAnswer}
            plays={listenPlays}
            onPlayed={() => setListenPlays((n) => n + 1)}
          />}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToStep(step - 1)}
          disabled={step === 0}
          className="rounded-lg border px-4 py-2 text-[15px] font-semibold disabled:opacity-40"
          style={{ borderColor: "var(--rail-line)", color: "var(--rail-ink)" }}
        >
          Quay lại
        </button>
        {step < ENTRY_TEST_SECTIONS.length - 1 ? (
          <button type="button" onClick={handleNext} className="rounded-lg px-5 py-2 text-[15px] font-bold text-white" style={{ background: "var(--rail-red)" }}>
            Tiếp theo
          </button>
        ) : (
          <button type="button" onClick={handleSubmitClick} className="rounded-lg px-5 py-2 text-[15px] font-bold text-white" style={{ background: "var(--rail-red)" }}>
            Nộp bài
          </button>
        )}
      </div>

      {phase === "submitting" && (
        <div className="fixed inset-0 z-10 grid place-items-center p-4" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="flex items-center gap-3 rounded-xl p-5" style={{ background: "var(--rail-bg)" }}>
            <Loader2 className="size-5 animate-spin" style={{ color: "var(--rail-red)" }} />
            <span className="text-[15px] font-semibold" style={{ color: "var(--rail-charcoal)" }}>
              Đang nộp bài...
            </span>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-10 grid place-items-center p-4" style={{ background: "rgba(0,0,0,.45)" }}>
          <div className="w-full max-w-md rounded-xl p-5" style={{ background: "var(--rail-bg)" }}>
            <h3 className="m-0 mb-2 text-[17px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
              {confirm.title}
            </h3>
            <p className="m-0 mb-4 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
              {confirm.text}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-lg border px-4 py-2 text-[15px] font-semibold"
                style={{ borderColor: "var(--rail-line)", color: "var(--rail-ink)" }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = confirm.onConfirm;
                  setConfirm(null);
                  fn();
                }}
                className="rounded-lg px-4 py-2 text-[15px] font-bold text-white"
                style={{ background: "var(--rail-red)" }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
