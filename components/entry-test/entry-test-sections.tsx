"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { ENTRY_TEST_LISTENING_MAX_PLAYS, type EntryTestSection } from "@/lib/entry-test-data";

type Answers = Record<string, string>;

function QuestionShell({ index, points, children }: { index: number; points: number; children: React.ReactNode }) {
  return (
    <div className="border-t py-3.5 first:border-t-0 first:pt-0" style={{ borderColor: "var(--rail-line)" }}>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[15px] font-semibold tabular-nums" style={{ color: "var(--rail-ink-dim)" }}>
          {index}.
        </span>
        <span className="text-[13px] font-bold" style={{ color: "var(--rail-red)" }}>
          ({points}đ)
        </span>
      </div>
      {children}
    </div>
  );
}

export function EntryTestWordSection({
  section,
  answers,
  onChange,
}: {
  section: EntryTestSection;
  answers: Answers;
  onChange: (questionId: string, value: string) => void;
}) {
  return (
    <div>
      {section.items.map((q, i) => (
        <QuestionShell key={q.id} index={i + 1} points={q.points}>
          {q.type === "mcq" && (
            <>
              <p className="m-0 mb-2.5 text-[15px] font-medium" style={{ color: "var(--rail-ink)" }}>
                {q.stem}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(q.options).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[15px]"
                    style={{
                      borderColor: answers[q.id] === key ? "var(--rail-red)" : "var(--rail-line)",
                      background: answers[q.id] === key ? "var(--rail-red-tint)" : "transparent",
                      color: "var(--rail-ink)",
                    }}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={key}
                      checked={answers[q.id] === key}
                      onChange={() => onChange(q.id, key)}
                      className="shrink-0"
                    />
                    <span>
                      <b>{key}.</b> {label}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
          {(q.type === "word_form" || q.type === "reorder") && (
            <>
              <p className="m-0 mb-1 text-[15px] font-medium" style={{ color: "var(--rail-ink)" }}>
                {q.stem}
              </p>
              <p className="m-0 mb-2 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-info)" }}>
                {q.type === "word_form" ? `Dạng đúng của từ: ${q.root}` : "Sắp xếp thành câu hoàn chỉnh"}
              </p>
              <input
                type="text"
                value={answers[q.id] ?? ""}
                onChange={(e) => onChange(q.id, e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-[15px]"
                style={{ borderColor: "var(--rail-line)", background: "var(--rail-bg)", color: "var(--rail-ink)" }}
                autoComplete="off"
              />
            </>
          )}
        </QuestionShell>
      ))}
    </div>
  );
}

export function EntryTestReadingSection({
  section,
  answers,
  onChange,
}: {
  section: EntryTestSection;
  answers: Answers;
  onChange: (questionId: string, value: string) => void;
}) {
  if (!section.passage || !section.wordBank) return null;

  const parts = section.passage.split("\n\n");
  const gapPattern = /\{(R\d)\}/g;

  return (
    <div>
      {section.instructionVi && (
        <p className="m-0 mb-3 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
          {section.instructionVi}
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {section.wordBank.map((w) => (
          <span
            key={w}
            className="rounded border border-dashed px-2 py-0.5 text-[13px]"
            style={{ borderColor: "var(--rail-line)", color: "var(--rail-ink-dim)" }}
          >
            {w}
          </span>
        ))}
      </div>
      <h3 className="mt-0 mb-2 text-[17px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
        {section.passageTitle}
      </h3>
      <div className="flex flex-col gap-3 text-[16px] leading-relaxed" style={{ color: "var(--rail-ink)" }}>
        {parts.map((paragraph, pi) => {
          const nodes: React.ReactNode[] = [];
          let lastIndex = 0;
          let match: RegExpExecArray | null;
          gapPattern.lastIndex = 0;
          while ((match = gapPattern.exec(paragraph))) {
            if (match.index > lastIndex) nodes.push(paragraph.slice(lastIndex, match.index));
            const gapId = match[1];
            nodes.push(
              <select
                key={gapId}
                aria-label={`Chỗ trống ${gapId}`}
                value={answers[gapId] ?? ""}
                onChange={(e) => onChange(gapId, e.target.value)}
                className="mx-1 rounded border px-1.5 py-0.5 text-[15px] font-semibold"
                style={{
                  borderColor: answers[gapId] ? "var(--rail-red)" : "var(--rail-line)",
                  background: "var(--rail-bg)",
                  color: "var(--rail-ink)",
                }}
              >
                <option value="">({gapId})</option>
                {section.wordBank!.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            );
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex < paragraph.length) nodes.push(paragraph.slice(lastIndex));
          return <p key={pi} className="m-0">{nodes}</p>;
        })}
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Phát file nghe tối đa N lần: được dừng/tiếp tục (không tốn thêm lượt), không tua. */
function ListeningAudio({ src, plays, onPlayed }: { src: string; plays: number; onPlayed: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [midway, setMidway] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      el?.pause();
    };
  }, []);

  const exhausted = plays >= ENTRY_TEST_LISTENING_MAX_PLAYS;

  async function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    if (midway) {
      try {
        await el.play();
        setPlaying(true);
      } catch {
        setError(true);
      }
      return;
    }
    if (exhausted) return;
    el.currentTime = 0;
    setError(false);
    try {
      await el.play();
      setPlaying(true);
      setMidway(true);
      onPlayed();
    } catch {
      setError(true);
    }
  }

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border p-3" style={{ borderColor: "var(--rail-line)", background: "var(--rail-surface-card)" }}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setMidway(false);
          setCurrent(0);
        }}
        onError={() => setError(true)}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={!playing && !midway && exhausted}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[15px] font-bold text-white disabled:opacity-50"
        style={{ background: "var(--rail-red)" }}
      >
        {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
        {playing ? "Dừng" : midway ? "Tiếp tục" : exhausted ? "Đã hết lượt nghe" : plays === 0 ? "Phát audio" : "Nghe lại"}
      </button>
      <div className="flex min-w-[140px] flex-1 flex-col gap-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--rail-line)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--rail-red)" }} />
        </div>
        <span className="font-mono text-[13px] tabular-nums" style={{ color: "var(--rail-ink-dim)" }}>
          {formatTime(current)} / {formatTime(duration)}
        </span>
      </div>
      <span className="text-[15px] font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
        Đã nghe {plays}/{ENTRY_TEST_LISTENING_MAX_PLAYS} lần
      </span>
      {error && (
        <p className="m-0 basis-full text-[15px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
          Không phát được audio. Hãy kiểm tra loa/tai nghe hoặc tải lại trang.
        </p>
      )}
    </div>
  );
}

export function EntryTestListeningSection({
  section,
  answers,
  onChange,
  plays,
  onPlayed,
}: {
  section: EntryTestSection;
  answers: Answers;
  onChange: (questionId: string, value: string) => void;
  plays: number;
  onPlayed: () => void;
}) {
  return (
    <div>
      <p className="m-0 mb-1 text-[15px] font-semibold" style={{ color: "var(--rail-charcoal)" }}>
        {section.instructionEn}
      </p>
      <p className="m-0 mb-3 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
        {section.instructionVi}
      </p>
      {section.audioUrl && <ListeningAudio src={section.audioUrl} plays={plays} onPlayed={onPlayed} />}
      {section.items.map((q, i) => {
        if (q.type !== "gap_fill" && q.type !== "short_answer") return null;
        return (
          <QuestionShell key={q.id} index={i + 1} points={q.points}>
            <p className="m-0 mb-1 text-[15px] font-medium" style={{ color: "var(--rail-ink)" }}>
              {q.stem}
            </p>
            <p className="m-0 mb-2 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
              Không quá {q.maxWords} từ
            </p>
            <input
              type="text"
              value={answers[q.id] ?? ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-[15px]"
              style={{ borderColor: "var(--rail-line)", background: "var(--rail-bg)", color: "var(--rail-ink)" }}
              autoComplete="off"
            />
          </QuestionShell>
        );
      })}
    </div>
  );
}
