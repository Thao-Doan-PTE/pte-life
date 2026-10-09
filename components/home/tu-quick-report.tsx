import Link from "next/link";
import { Zap, CalendarDays } from "lucide-react";
import type { TuTypeProgress, TuQuickReportStats } from "@/lib/tu-queries";

const TYPE_HREF: Record<string, string> = {
  "write-from-dictation": "/practice/listening/write-from-dictation?bank=TU",
  "repeat-sentence": "/practice/speaking/repeat-sentence?bank=TU",
};

export function TuQuickReport({
  progress,
  stats,
}: {
  progress: TuTypeProgress[];
  stats: TuQuickReportStats;
}) {
  const totalQuestions = progress.reduce((sum, t) => sum + t.totalCount, 0);
  const totalDone = progress.reduce((sum, t) => sum + t.practicedCount, 0);
  const donePct = totalQuestions > 0 ? Math.round((totalDone / totalQuestions) * 100) : 0;

  const avgDonutPct = stats.avgScore != null ? Math.min(100, Math.round((stats.avgScore / 90) * 100)) : 0;

  if (totalQuestions === 0) {
    return null;
  }

  if (totalDone === 0) {
    return (
      <div className="rounded-2xl p-8 text-center shadow-sm" style={{ background: "var(--rail-surface-card)", border: "1px solid var(--rail-line)" }}>
        <div className="text-4xl">🎯</div>
        <h3 className="mt-2 text-[20px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
          Bạn chưa bắt đầu luyện đề Tủ
        </h3>
        <Link
          href={TYPE_HREF[progress[0]?.typeId] ?? "#"}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[15px] font-bold"
          style={{ background: "var(--rail-red)", color: "var(--rail-cta-text)" }}
        >
          Luyện tập ngay
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{ background: "var(--rail-surface-card)", border: "1px solid var(--rail-line)" }}>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="flex flex-col items-center rounded-xl p-3 text-center shadow-sm" style={{ background: "var(--rail-bg)", border: "1px solid var(--rail-line)" }}>
          <div className="mb-1.5 flex size-8 items-center justify-center rounded-lg" style={{ background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }}>
            <Zap className="size-4" />
          </div>
          <p className="font-mono text-2xl font-semibold" style={{ color: "var(--rail-charcoal)" }}>
            {totalDone}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
            Tổng luyện tập
          </p>
          <p className="text-xs" style={{ color: "var(--rail-ink-dim)" }}>
            câu · {donePct}% kho đề ({totalQuestions} câu)
          </p>
        </div>

        <div className="flex flex-col items-center rounded-xl p-3 text-center shadow-sm" style={{ background: "var(--rail-bg)", border: "1px solid var(--rail-line)" }}>
          <div
            className="mb-1 grid size-11 place-items-center rounded-full"
            style={{ background: `conic-gradient(var(--rail-red) ${avgDonutPct}%, var(--rail-line) 0)` }}
          >
            <div className="grid size-8.5 place-items-center rounded-full text-xs font-semibold" style={{ background: "var(--rail-bg)", color: "var(--rail-charcoal)" }}>
              {stats.avgScore != null ? `${avgDonutPct}%` : "–"}
            </div>
          </div>
          <p className="font-mono text-2xl font-semibold" style={{ color: "var(--rail-charcoal)" }}>
            {stats.avgScore != null ? `${stats.avgScore}/90` : "–"}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
            Điểm trung bình
          </p>
        </div>

        <div className="flex flex-col items-center rounded-xl p-3 text-center shadow-sm" style={{ background: "var(--rail-bg)", border: "1px solid var(--rail-line)" }}>
          <div className="mb-1.5 flex size-8 items-center justify-center rounded-lg" style={{ background: "var(--rail-ok-tint)", color: "var(--rail-ok)" }}>
            <CalendarDays className="size-4" />
          </div>
          <p className="font-mono text-2xl font-semibold" style={{ color: "var(--rail-charcoal)" }}>
            {stats.daysPracticed}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
            Ngày luyện tập
          </p>
          <p className="text-xs" style={{ color: "var(--rail-ink-dim)" }}>
            chuỗi {stats.streak} ngày liên tiếp
          </p>
        </div>
      </div>
    </div>
  );
}
