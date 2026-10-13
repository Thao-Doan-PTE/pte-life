import type { ReactNode } from "react";
import { MutedText, Pill } from "@/components/admin/admin-ui";
import type { AiGradeView, AnswerView, PromptView } from "@/lib/admin/grading-queries";

/** Phần nội dung bài làm ở cột phải trang Chấm bài: đề bài, câu trả lời của học
 * viên (Writing: văn bản + số từ; Speaking: file ghi âm + bản chuyển văn bản) và
 * điểm AI chấm sơ bộ để giáo viên tham khảo. */

export function SectionHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mb-2 text-[12px] font-semibold tracking-[0.07em] uppercase" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </h3>
  );
}

const BOX_STYLE = { background: "var(--adm-surface)", borderColor: "var(--adm-line)" } as const;

export function PromptBlock({ prompt, questionCode }: { prompt: PromptView; questionCode: string }) {
  const hasContent = prompt.text || prompt.imageUrl || prompt.audioUrl;
  return (
    <div>
      <SectionHeading>
        {prompt.label} <span className="font-normal normal-case tracking-normal">· câu {questionCode}</span>
      </SectionHeading>
      {!hasContent && <MutedText>Không có nội dung đề để hiển thị.</MutedText>}
      <div className="flex flex-col gap-2.5">
        {prompt.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prompt.imageUrl}
            alt="Hình ảnh của đề bài"
            className="h-auto max-h-80 w-auto max-w-full rounded-[10px] border object-contain"
            style={{ borderColor: "var(--adm-line)" }}
          />
        )}
        {prompt.audioUrl && (
          <audio controls preload="none" src={prompt.audioUrl} className="w-full max-w-[520px]" aria-label="Audio của đề bài">
            Trình duyệt không phát được audio.
          </audio>
        )}
        {prompt.text && (
          <div
            role="region"
            aria-label={prompt.label}
            tabIndex={0}
            className="font-passage max-h-64 max-w-[75ch] overflow-y-auto rounded-[10px] border px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap"
            style={BOX_STYLE}
          >
            {prompt.text}
          </div>
        )}
      </div>
    </div>
  );
}

export function AnswerBlock({ answer }: { answer: AnswerView }) {
  if (answer.kind === "text") {
    return (
      <div>
        <SectionHeading>Bài làm</SectionHeading>
        {answer.text.trim() ? (
          <div
            className="font-passage max-w-[75ch] rounded-[10px] border px-4 py-3 text-[15px] leading-[1.75] break-words whitespace-pre-wrap"
            style={BOX_STYLE}
          >
            {answer.text}
          </div>
        ) : (
          <MutedText>Học viên nộp bài trống.</MutedText>
        )}
        <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Số từ: <span className="adm-num font-semibold">{answer.wordCount}</span>
        </p>
      </div>
    );
  }

  const meta = [
    answer.durationSeconds !== null ? `Thời lượng ${Math.round(answer.durationSeconds)} giây` : null,
    answer.wordsPerMinute !== null ? `${answer.wordsPerMinute} từ/phút` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <SectionHeading>Bài nói</SectionHeading>
        {answer.audioUrl ? (
          <audio
            controls
            preload="metadata"
            src={answer.audioUrl}
            className="w-full max-w-[520px]"
            aria-label="Bản ghi âm bài nói của học viên"
          >
            Trình duyệt không phát được bản ghi âm.
          </audio>
        ) : (
          <MutedText>Bài này chưa có file ghi âm.</MutedText>
        )}
        {meta.length > 0 && (
          <p className="adm-num mt-1.5 text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {meta.join(" · ")}
          </p>
        )}
      </div>
      <div>
        <SectionHeading>Bản chuyển văn bản tự động</SectionHeading>
        {answer.transcript ? (
          <div
            className="font-passage max-w-[75ch] rounded-[10px] border px-4 py-3 text-[14.5px] leading-relaxed break-words whitespace-pre-wrap"
            style={BOX_STYLE}
          >
            {answer.transcript}
          </div>
        ) : (
          <MutedText>Không nhận dạng được lời nói.</MutedText>
        )}
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Nhận dạng giọng nói bằng trình duyệt nên có thể sai — nghe bản ghi âm để chấm chính xác.
        </p>
      </div>
    </div>
  );
}

export function AiGradeBlock({ ai }: { ai: AiGradeView | null }) {
  if (!ai) {
    return (
      <div className="rounded-[10px] border px-4 py-3" style={{ borderColor: "var(--adm-line)" }}>
        <SectionHeading>AI chấm sơ bộ</SectionHeading>
        <MutedText>Bài này chưa có điểm AI sơ bộ.</MutedText>
      </div>
    );
  }
  return (
    <div className="rounded-[10px] border px-4 py-3" style={{ borderColor: "var(--adm-line)" }}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[12px] font-semibold tracking-[0.07em] uppercase" style={{ color: "var(--adm-ink-3)" }}>
          AI chấm sơ bộ
        </h3>
        <Pill tone="plum">
          <span className="adm-num">
            {ai.scorePct}% · PTE {ai.pteScore}
          </span>
        </Pill>
      </div>
      {ai.criteria.length > 0 && (
        <ul className="flex flex-col gap-2">
          {ai.criteria.map((c) => (
            <li key={c.key} className="text-[13px]">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{c.label}</span>
                <span className="adm-num shrink-0 font-semibold" style={{ color: "var(--adm-plum)" }}>
                  {c.scorePct}%
                </span>
              </div>
              {c.feedback && (
                <p className="mt-0.5 leading-relaxed" style={{ color: "var(--adm-ink-2)" }}>
                  {c.feedback}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {ai.formCheck && (
        <p className="mt-2.5 text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
          <span className="adm-num">
            Số từ {ai.formCheck.wordCount} · số câu {ai.formCheck.sentenceCount}
          </span>
          {ai.formCheck.reason && ` — ${ai.formCheck.reason}`}
        </p>
      )}
      {ai.generalFeedback && (
        <p className="mt-2.5 text-[13px] leading-relaxed" style={{ color: "var(--adm-ink-2)" }}>
          {ai.generalFeedback}
        </p>
      )}
      {ai.appliedRules.length > 0 && (
        <div className="mt-2.5">
          <p className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Quy tắc đã áp dụng
          </p>
          <ul className="mt-1 list-disc pl-5 text-[12.5px] leading-relaxed" style={{ color: "var(--adm-ink-2)" }}>
            {ai.appliedRules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2.5 text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        Điểm AI chỉ để tham khảo và được giữ nguyên — giáo viên tự nhập điểm theo rubric bên dưới.
      </p>
    </div>
  );
}
