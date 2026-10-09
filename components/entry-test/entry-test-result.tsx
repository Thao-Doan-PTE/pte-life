import { ConsultationDialog } from "@/components/entry-test/consultation-dialog";
import type { EntryTestGradeSummary } from "@/lib/entry-test-grading";
import type { EntryTestReviewRow } from "@/lib/entry-test-queries";

const SECTION_LABEL_VI: Record<string, string> = {
  Speaking: "Kỹ năng nói",
  Word: "Từ vựng - ngữ pháp",
  Reading: "Kỹ năng đọc hiểu",
  Listening: "Kỹ năng nghe",
};

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m} phút ${s} giây`;
}

export function EntryTestResult({
  summary,
  rows,
  autoSubmitted,
  durationUsedSec,
  defaultName,
  defaultEmail,
}: {
  summary: EntryTestGradeSummary;
  rows: EntryTestReviewRow[];
  autoSubmitted: boolean;
  durationUsedSec: number;
  defaultName?: string;
  defaultEmail?: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="m-0 mb-1.5 text-[clamp(22px,2.6vw,30px)] leading-[1.15] font-bold" style={{ color: "var(--rail-charcoal)" }}>
          Kết quả test đầu vào
        </h2>
        <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
          {autoSubmitted ? "Hết giờ, hệ thống đã tự nộp bài. " : ""}
          Thời gian làm bài: {formatDuration(durationUsedSec)}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.sections.map((s) => (
          <div key={s.key} className="rounded-lg border p-3" style={{ borderColor: "var(--rail-line)", background: "var(--rail-bg)" }}>
            <p className="m-0 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
              {s.name}
            </p>
            <p className="m-0 mt-1 text-2xl font-bold" style={{ color: "var(--rail-charcoal)" }}>
              {s.pending ? "–" : s.pointsAwarded}
              <span className="text-[15px] font-normal" style={{ color: "var(--rail-ink-dim)" }}>
                {" "}
                / {s.pointsMax}
              </span>
            </p>
            <span
              className="mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold"
              style={
                s.pending
                  ? { background: "var(--rail-warning-tint)", color: "var(--rail-charcoal)" }
                  : { background: "var(--rail-ok-tint)", color: "var(--rail-ok)" }
              }
            >
              {s.pending ? "Chờ giáo viên chấm" : "Máy chấm"}
            </span>
          </div>
        ))}
      </div>

      <ConsultationDialog defaultName={defaultName} defaultEmail={defaultEmail} />

      <div>
        <h3 className="mb-2 text-[17px] font-bold" style={{ color: "var(--rail-charcoal)" }}>
          Chi tiết từng câu
        </h3>
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "var(--rail-line)" }}>
          <table className="w-full text-[15px]">
            <thead>
              <tr style={{ background: "var(--rail-surface)" }}>
                <th className="p-2 text-left" style={{ color: "var(--rail-ink-dim)" }}>Câu</th>
                <th className="p-2 text-left" style={{ color: "var(--rail-ink-dim)" }}>Bài làm</th>
                <th className="p-2 text-left" style={{ color: "var(--rail-ink-dim)" }}>Đáp án</th>
                <th className="p-2 text-left" style={{ color: "var(--rail-ink-dim)" }}>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.questionId} className="border-t" style={{ borderColor: "var(--rail-line)" }}>
                  <td className="p-2 align-top" style={{ color: "var(--rail-ink)" }}>
                    {r.questionId}
                    <div className="text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
                      {SECTION_LABEL_VI[r.sectionName] ?? r.sectionName}
                    </div>
                  </td>
                  <td className="p-2 align-top" style={{ color: "var(--rail-ink)" }}>
                    {r.audioUrl ? (
                      <span style={{ color: "var(--rail-ok)" }}>Đã ghi âm</span>
                    ) : r.responseText ? (
                      r.responseText
                    ) : (
                      <span style={{ color: "var(--rail-ink-dim)" }}>(bỏ trống)</span>
                    )}
                  </td>
                  <td className="p-2 align-top" style={{ color: "var(--rail-ink-dim)" }}>
                    {r.answerDisplay ?? "–"}
                  </td>
                  <td className="p-2 align-top">
                    {r.pointsAwarded == null ? (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--rail-warning-tint)", color: "var(--rail-charcoal)" }}>
                        chờ
                      </span>
                    ) : r.pointsAwarded > 0 ? (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--rail-ok-tint)", color: "var(--rail-ok)" }}>
                        {r.pointsAwarded}/{r.pointsMax}
                      </span>
                    ) : (
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }}>
                        0/{r.pointsMax}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
          Ngưỡng xếp trình độ là đề xuất, cần bộ phận học thuật duyệt.
        </p>
      </div>
    </div>
  );
}
