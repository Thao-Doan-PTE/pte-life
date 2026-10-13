import Link from "next/link";
import { Headphones, Mic, ArrowRight } from "lucide-react";
import { StageCard } from "@/components/home/stage-intro";
import { TuQuickReport } from "@/components/home/tu-quick-report";
import { createTuMockTestSession } from "@/lib/actions/mocktest";
import { formatRelativeOrDate, scoreColorClass } from "@/lib/format";
import { SKILL_ACCENT_COLOR } from "@/lib/question-types";
import { formatVnDate } from "@/lib/admin/student-status";
import type { TuOverview, TuQuickReportStats } from "@/lib/tu-queries";

const TYPE_ICON: Record<string, typeof Headphones> = {
  "write-from-dictation": Headphones,
  "repeat-sentence": Mic,
};

const TYPE_HREF: Record<string, string> = {
  "write-from-dictation": "/practice/listening/write-from-dictation?bank=TU",
  "repeat-sentence": "/practice/speaking/repeat-sentence?bank=TU",
};

/* Trang /de-tu mở cho cả tài khoản dùng thử Tủ (chưa có lớp): mọi liên kết ở đây
 * chỉ trỏ vào bộ đề Tủ (?bank=TU) hoặc thi thử Đề Tủ — KHÔNG thêm liên kết sang
 * khu vực cần lớp học (/mocktest, /luyen-de-pte, danh sách luyện tập không có ?bank=TU). */
export function TuOverviewView({
  overview,
  stats,
  trialUntil = null,
}: {
  overview: TuOverview;
  stats: TuQuickReportStats;
  /** Hạn dùng thử khi tài khoản đang vào bằng danh sách mời (chưa có lớp); null = học viên có lớp. */
  trialUntil?: Date | string | null;
}) {
  const { progress, recent, totalQuestions } = overview;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
          Học tập
        </p>
        <h2 className="mt-2.5 mb-1.5 text-[clamp(24px,2.8vw,34px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
          Luyện đề Tủ
        </h2>
        <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
          Bộ câu hỏi Write From Dictation &amp; Repeat Sentence do giáo viên PTELife tổng hợp hàng tuần, update liên tục!
        </p>
        {trialUntil != null && (
          <p
            className="mt-3 mb-0 inline-flex flex-wrap items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold"
            style={{ background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }}
          >
            Bạn đang dùng thử Luyện đề Tủ đến {formatVnDate(trialUntil)}
          </p>
        )}
      </div>

      {totalQuestions === 0 ? (
        <StageCard>
          <p className="m-0" style={{ color: "var(--rail-ink-dim)" }}>
            Đội học thuật PTE-Life đang tổng hợp danh sách câu hỏi Tủ. Tính năng sẽ sớm có nội dung đầy đủ cho bạn luyện tập.
          </p>
        </StageCard>
      ) : (
        <TuQuickReport progress={progress} stats={stats} />
      )}

      {totalQuestions > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {progress.map((p) => {
            const Icon = TYPE_ICON[p.typeId];
            const pct = p.totalCount > 0 ? Math.round((p.practicedCount / p.totalCount) * 100) : 0;
            return (
              <div
                key={p.typeId}
                className="flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[var(--rail-red)] hover:shadow-md"
                style={{ borderColor: "var(--rail-line)", background: "var(--rail-bg)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }}
                  >
                    <Icon className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 truncate text-[15px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
                      {p.typeName}
                    </p>
                    <p className="m-0 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
                      Đã luyện {p.practicedCount}/{p.totalCount} câu
                    </p>
                  </div>
                  <span
                    className="flex w-11 shrink-0 items-center justify-center rounded-md py-0.5 text-xs font-bold text-white"
                    style={{ background: SKILL_ACCENT_COLOR[p.skill] }}
                  >
                    {p.typeCode}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--rail-line)" }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--rail-red)" }} />
                </div>
                <Link
                  href={TYPE_HREF[p.typeId]}
                  className="ml-auto flex w-fit items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: SKILL_ACCENT_COLOR[p.skill] }}
                >
                  Vào luyện ngay <ArrowRight className="size-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="flex flex-col items-start gap-4 rounded-xl px-6 py-6 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "linear-gradient(135deg, #0D004D 0%, #241080 100%)" }}
      >
        <div>
          <h3 className="m-0 text-[20px] font-semibold text-white">Thi thử Đề Tủ</h3>
          <p className="m-0 text-[15px] text-white/70">
            Làm 1 bài thi thử trộn Write From Dictation &amp; Repeat Sentence, theo đúng câu hỏi trong bộ Tủ.
          </p>
        </div>
        <form action={createTuMockTestSession}>
          <input type="hidden" name="randomize" value="true" />
          <button
            type="submit"
            disabled={totalQuestions === 0}
            className="flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2.5 text-[15px] font-bold disabled:opacity-50"
            style={{ background: "var(--rail-red)", color: "var(--rail-cta-text)" }}
          >
            Bắt đầu <ArrowRight className="size-4" />
          </button>
        </form>
      </div>

      {recent.length > 0 && (
        <StageCard>
          <p className="m-0 mb-3 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
            Hoạt động Tủ gần đây
          </p>
          <div className="flex flex-col divide-y" style={{ borderColor: "var(--rail-line)" }}>
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                <span style={{ color: "var(--rail-charcoal)" }}>
                  {r.typeCode} · {r.questionCode}
                </span>
                <div className="flex items-center gap-3 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
                  <span className={scoreColorClass(r.scorePct)}>{r.scorePct}%</span>
                  <span>{formatRelativeOrDate(r.attemptedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </StageCard>
      )}
    </div>
  );
}
