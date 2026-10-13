import type { CSSProperties, ReactNode } from "react";
import { MutedText, Panel, Pill } from "@/components/admin/admin-ui";
import { QUESTION_TYPE_LABEL } from "@/components/admin/entry-tests/entry-test-labels";
import type { EntryTestDetailItem, EntryTestDetailSection } from "@/lib/admin/entry-test-admin-queries";
import type { EntryTestQuestion, EntryTestSection } from "@/lib/entry-test-data";

/** Bài làm từng phần của 1 lượt test đầu vào (chỉ xem): đề/câu hỏi, câu trả lời
 * của người làm test, đáp án chuẩn (nếu có) và điểm. Speaking/Listening hiện
 * "Chờ giáo viên chấm" — chưa có thao tác chấm (thang điểm còn chờ quyết định). */

const BOX_STYLE: CSSProperties = { background: "var(--adm-surface)", borderColor: "var(--adm-line)" };
const GAP_TOKEN = /(\{[A-Z]+\d+\})/;

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-[11.5px] font-semibold tracking-[0.06em] uppercase" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

function PassageBox({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`font-passage max-w-[75ch] rounded-[10px] border px-3.5 py-2.5 text-[14.5px] leading-relaxed break-words whitespace-pre-line ${className ?? ""}`}
      style={BOX_STYLE}
    >
      {children}
    </div>
  );
}

/** Câu chứa chỗ trống `{id}` trong đoạn văn Reading (để hiện ngữ cảnh cho từng câu). */
function gapSentence(passage: string, id: string): string | null {
  const paragraphs = passage.split(/\n+/);
  for (const p of paragraphs) {
    const sentence = p.split(/(?<=[.!?])\s+/).find((s) => s.includes(`{${id}}`));
    if (sentence) return sentence;
  }
  return null;
}

/** Hiện câu có chỗ trống: chỗ trống của câu đang xem tô đậm, chỗ trống khác thu gọn. */
function GapSentence({ text, activeId }: { text: string; activeId: string }) {
  return (
    <>
      {text.split(GAP_TOKEN).map((part, i) => {
        const m = part.match(/^\{([A-Z]+\d+)\}$/);
        if (!m) return <span key={i}>{part}</span>;
        if (m[1] === activeId) {
          return (
            <span key={i} className="font-semibold" style={{ color: "var(--adm-brand-text)" }}>
              ({m[1]}) ________
            </span>
          );
        }
        return (
          <span key={i} style={{ color: "var(--adm-ink-3)" }}>
            ({m[1]})
          </span>
        );
      })}
    </>
  );
}

/** Đoạn văn Reading đầy đủ, mỗi chỗ trống điền sẵn câu trả lời của người làm test. */
function FilledPassage({ passage, items }: { passage: string; items: EntryTestDetailItem[] }) {
  const byId = new Map(items.map((i) => [i.question.id, i]));
  return (
    <>
      {passage.split(GAP_TOKEN).map((part, i) => {
        const m = part.match(/^\{([A-Z]+\d+)\}$/);
        if (!m) return <span key={i}>{part}</span>;
        const item = byId.get(m[1]);
        const answer = item?.responseText?.trim();
        const tone =
          item?.isCorrect === true
            ? { background: "var(--adm-ok-soft)", color: "var(--adm-ok)" }
            : item?.isCorrect === false
              ? { background: "var(--adm-brand-soft)", color: "var(--adm-brand-text)" }
              : { background: "var(--adm-surface-2)", color: "var(--adm-ink-2)" };
        // Đúng/sai không chỉ bằng màu (WCAG 1.4.1): thêm dấu ✓/✗ nhìn thấy được,
        // gạch ngang câu sai, và chữ ẩn cho trình đọc màn hình.
        return (
          <span key={i} className="mx-0.5 inline-flex items-baseline gap-1 rounded-md px-1.5 font-semibold" style={tone}>
            <span className="adm-num text-[11.5px] opacity-80">{m[1]}</span>
            <span className={item?.isCorrect === false && answer ? "line-through" : undefined}>{answer || "—"}</span>
            {item?.isCorrect === true && (
              <>
                <span aria-hidden="true">✓</span>
                <span className="sr-only"> (đúng)</span>
              </>
            )}
            {item?.isCorrect === false && (
              <>
                <span aria-hidden="true">✗</span>
                <span className="sr-only"> (sai)</span>
              </>
            )}
          </span>
        );
      })}
    </>
  );
}

function SectionIntro({ section, items }: { section: EntryTestSection; items: EntryTestDetailItem[] }) {
  const hasIntro = section.instructionVi || section.instructionEn || section.passage || section.wordBank || section.audioUrl;
  if (!hasIntro) return null;
  return (
    <div className="flex flex-col gap-3 border-b px-4 py-3.5" style={{ borderColor: "var(--adm-line)" }}>
      {(section.instructionVi || section.instructionEn) && (
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--adm-ink-2)" }}>
          {section.instructionVi ?? section.instructionEn}
        </p>
      )}
      {section.audioUrl && (
        <div>
          <SubHeading>File nghe của đề</SubHeading>
          <audio controls preload="none" src={section.audioUrl} className="w-full max-w-[520px]" aria-label={`File nghe phần ${section.name}`}>
            Trình duyệt không phát được audio.
          </audio>
        </div>
      )}
      {section.wordBank && section.wordBank.length > 0 && (
        <div>
          <SubHeading>Ngân hàng từ</SubHeading>
          <div className="flex flex-wrap gap-1.5">
            {section.wordBank.map((w) => (
              <span key={w} className="adm-tag font-passage">
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
      {section.passage && (
        <details>
          <summary className="cursor-pointer text-[13px] font-semibold select-none" style={{ color: "var(--adm-ink)" }}>
            Đoạn văn{section.passageTitle ? `: ${section.passageTitle}` : ""} — kèm câu trả lời
          </summary>
          <PassageBox className="mt-2">
            <FilledPassage passage={section.passage} items={items} />
          </PassageBox>
        </details>
      )}
    </div>
  );
}

function QuestionPrompt({ q, section }: { q: EntryTestQuestion; section: EntryTestSection }) {
  switch (q.type) {
    case "read_aloud":
      return (
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
            {q.instructionVi}
          </p>
          <PassageBox>{q.text}</PassageBox>
        </div>
      );
    case "mcq":
      return (
        <div className="flex flex-col gap-2">
          <p className="font-passage text-[14.5px] leading-relaxed break-words">{q.stem}</p>
          <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {Object.entries(q.options).map(([key, text]) => {
              const isAnswer = key === q.answer;
              return (
                <li
                  key={key}
                  className="font-passage rounded-md px-2 py-1 text-[13.5px] break-words"
                  style={isAnswer ? { background: "var(--adm-ok-soft)", color: "var(--adm-ok)" } : { color: "var(--adm-ink-2)" }}
                >
                  <span className="font-semibold">{key}.</span> {text}
                  {isAnswer && <span className="sr-only"> (đáp án đúng)</span>}
                </li>
              );
            })}
          </ul>
        </div>
      );
    case "word_form":
      return (
        <p className="font-passage text-[14.5px] leading-relaxed break-words">
          {q.stem}{" "}
          <span className="font-semibold whitespace-nowrap" style={{ color: "var(--adm-ink-2)" }}>
            ({q.root})
          </span>
        </p>
      );
    case "reorder":
      return (
        <div>
          <MutedText>Sắp xếp các từ thành câu hoàn chỉnh:</MutedText>
          <p className="font-passage text-[14.5px] leading-relaxed break-words">{q.stem}</p>
        </div>
      );
    case "dropdown_gap": {
      const sentence = section.passage ? gapSentence(section.passage, q.id) : null;
      return sentence ? (
        <p className="font-passage text-[14.5px] leading-relaxed break-words">
          <GapSentence text={sentence} activeId={q.id} />
        </p>
      ) : (
        <MutedText>Chỗ trống {q.id} trong đoạn văn.</MutedText>
      );
    }
    case "gap_fill":
    case "short_answer":
      return (
        <div>
          <p className="font-passage text-[14.5px] leading-relaxed break-words">{q.stem}</p>
          <MutedText>Tối đa {q.maxWords} từ</MutedText>
        </div>
      );
    default:
      return null;
  }
}

/** Hiện câu trả lời dạng chữ; trắc nghiệm hiện kèm nội dung phương án đã chọn. */
function displayResponse(q: EntryTestQuestion, value: string): string {
  if (q.type === "mcq") {
    const key = value.trim().toUpperCase();
    const text = q.options[key];
    return text ? `${key}. ${text}` : value;
  }
  return value;
}

function AnswerBox({
  label,
  tone = "neutral",
  children,
}: {
  label: string;
  tone?: "ok" | "bad" | "neutral";
  children: ReactNode;
}) {
  const accent = tone === "ok" ? "var(--adm-ok)" : tone === "bad" ? "var(--adm-brand)" : "var(--adm-line)";
  return (
    <div className="min-w-0 rounded-[10px] border border-l-[3px] px-3 py-2" style={{ ...BOX_STYLE, borderLeftColor: accent }}>
      <SubHeading>{label}</SubHeading>
      <div className="text-[14px] leading-relaxed break-words">{children}</div>
    </div>
  );
}

function ItemScore({ item }: { item: EntryTestDetailItem }) {
  if (item.pending) return <Pill tone="warn">Chờ giáo viên chấm</Pill>;
  const pts = item.pointsAwarded ?? 0;
  return (
    <Pill tone={pts > 0 ? "ok" : "bad"}>
      <span className="adm-num">
        {pts}/{item.question.points} điểm
      </span>
    </Pill>
  );
}

function QuestionItem({ item, section }: { item: EntryTestDetailItem; section: EntryTestSection }) {
  const q = item.question;
  const response = item.responseText?.trim() ?? "";
  const tone = item.isCorrect === true ? "ok" : item.isCorrect === false ? "bad" : "neutral";

  return (
    <li className="flex min-w-0 flex-col gap-2.5 border-b px-4 py-4 last:border-b-0" style={{ borderColor: "var(--adm-line)" }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="adm-tag adm-num">{q.id}</span>
          <MutedText>
            {QUESTION_TYPE_LABEL[q.type]} · {q.points} điểm
          </MutedText>
        </div>
        <ItemScore item={item} />
      </div>

      <QuestionPrompt q={q} section={section} />

      {q.type === "read_aloud" ? (
        <AnswerBox label="Bài nói">
          {item.audioUrl ? (
            <audio
              controls
              preload="metadata"
              src={item.audioUrl}
              className="mt-0.5 w-full max-w-[520px]"
              aria-label={`Bản ghi âm câu ${q.id} của người làm test`}
            >
              Trình duyệt không phát được bản ghi âm.
            </audio>
          ) : (
            <MutedText>Không có file ghi âm.</MutedText>
          )}
        </AnswerBox>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <AnswerBox label="Bài làm" tone={tone}>
            {response ? (
              <span className="font-passage">{displayResponse(q, response)}</span>
            ) : (
              <MutedText>(bỏ trống)</MutedText>
            )}
          </AnswerBox>
          <AnswerBox label="Đáp án">
            {item.correctAnswers ? (
              <span className="font-passage">
                {item.correctAnswers.map((a) => displayResponse(q, a)).join(" / ")}
              </span>
            ) : (
              <MutedText>Chưa có đáp án chuẩn — giáo viên chấm tay</MutedText>
            )}
          </AnswerBox>
        </div>
      )}

      {item.keyChanged && (
        <MutedText>
          Đáp án đã đổi sau khi nộp — điểm tính theo đáp án lúc nộp (
          <span className="adm-num">
            {item.pointsAwarded ?? 0}/{q.points}
          </span>
          ), chấm lại theo đáp án mới được{" "}
          <span className="adm-num">
            {item.regradedPoints ?? 0}/{q.points}
          </span>
          .
        </MutedText>
      )}
    </li>
  );
}

function SectionScore({ s }: { s: EntryTestDetailSection }) {
  if (s.pointsAwarded == null) return <Pill tone="warn">Chờ giáo viên chấm</Pill>;
  return (
    <div className="flex items-center gap-2">
      <span className="adm-num text-[15px] font-semibold">
        {s.pointsAwarded}
        <span style={{ color: "var(--adm-ink-3)" }}>/{s.pointsMax}</span>
      </span>
      <Pill tone={s.teacherGraded ? "ok" : "mute"}>{s.teacherGraded ? "Giáo viên đã chấm" : "Máy chấm"}</Pill>
    </div>
  );
}

export function EntryTestAnswerSections({ sections }: { sections: EntryTestDetailSection[] }) {
  return (
    <>
      {sections.map((s) => (
        <Panel
          key={s.section.key}
          title={`${s.section.order}. ${s.section.name}`}
          meta={`${s.section.nameVi} · ${s.pointsMax} điểm`}
          actions={<SectionScore s={s} />}
        >
          <SectionIntro section={s.section} items={s.items} />
          <ol className="flex flex-col" aria-label={`Các câu phần ${s.section.name}`}>
            {s.items.map((item) => (
              <QuestionItem key={item.question.id} item={item} section={s.section} />
            ))}
          </ol>
        </Panel>
      ))}
    </>
  );
}
