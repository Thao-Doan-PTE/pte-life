import { ChoiceReview } from "@/components/practice/review/choice-review";
import { BlanksReview } from "@/components/practice/review/blanks-review";
import { ReorderReview } from "@/components/practice/review/reorder-review";
import { HighlightReview } from "@/components/practice/review/highlight-review";
import { DictationReview } from "@/components/practice/review/dictation-review";
import { WritingReview } from "@/components/practice/review/writing-review";
import { SpeakingReview } from "@/components/practice/review/speaking-review";
import { scoreAttempt, RULE_BASED_TYPE_IDS } from "@/lib/scoring/rule-based";
import type { DictationWordDiff } from "@/lib/scoring/rule-based";
import type { BlankSegment } from "@/components/practice/dropdown-blanks";
import type { ParagraphItem } from "@/components/practice/reorder-paragraphs";
import type { WritingGradeResult } from "@/lib/scoring/ai/types";
import type { SpeakingGradeResult } from "@/lib/scoring/ai/speaking-index";

const AI_WRITING_TYPES = new Set([
  "write-essay",
  "summarize-written-text",
  "summarize-spoken-text",
]);

/** Dựng lại review đầy đủ cho 1 lượt làm bài trong Lịch sử. Với các dạng rule-based,
 * chạy lại scoreAttempt() trên response đã lưu + content hiện tại của câu hỏi để lấy
 * đáp án đúng (reveal) — tránh phải lưu trùng lặp dữ liệu chấm điểm trong DB. */
export function renderAttemptReview(
  questionTypeId: string,
  content: Record<string, unknown>,
  response: unknown
) {
  if (RULE_BASED_TYPE_IDS.has(questionTypeId)) {
    let result;
    try {
      result = scoreAttempt(questionTypeId, content, response);
    } catch {
      return <p className="text-sm text-muted-foreground">Không thể tải lại kết quả.</p>;
    }

    switch (questionTypeId) {
      case "reading-mcq-single":
      case "reading-mcq-multiple":
      case "listening-mcq-single":
      case "listening-mcq-multiple":
      case "highlight-correct-summary":
      case "select-missing-word":
        return (
          <ChoiceReview
            options={content.options as string[]}
            selected={response as number[]}
            correctIndexes={result.reveal.correctIndexes as number[]}
          />
        );
      case "reading-fill-blanks-dropdown":
      case "reading-fill-blanks-drag-drop":
      case "listening-fill-blanks":
        return (
          <BlanksReview
            segments={content.segments as BlankSegment[]}
            userAnswers={response as Record<string, string>}
            correctAnswers={result.reveal.correctAnswers as Record<string, string>}
          />
        );
      case "reorder-paragraphs": {
        const paragraphs = content.paragraphs as ParagraphItem[];
        const byId = new Map(paragraphs.map((p) => [p.id, p]));
        const userOrder = (response as string[]).map(
          (id) => byId.get(id) ?? { id, text: "?" }
        );
        return (
          <ReorderReview
            userOrder={userOrder}
            correctOrder={result.reveal.correctOrder as string[]}
          />
        );
      }
      case "highlight-incorrect-words":
        return (
          <HighlightReview
            words={content.words as string[]}
            selected={response as number[]}
            incorrectIndexes={result.reveal.incorrectIndexes as number[]}
          />
        );
      case "write-from-dictation":
        return <DictationReview diff={result.reveal.diff as DictationWordDiff[]} />;
    }
  }

  if (AI_WRITING_TYPES.has(questionTypeId)) {
    const r = response as { text: string; grade: WritingGradeResult };
    return <WritingReview studentText={r.text} grade={r.grade} />;
  }

  const r = response as {
    transcript?: string;
    wordsPerMinute?: number;
    fillerWordCount?: number;
    grade?: SpeakingGradeResult;
  };
  if (r.grade) {
    return (
      <SpeakingReview
        transcript={r.transcript ?? ""}
        wordsPerMinute={r.wordsPerMinute ?? 0}
        fillerWordCount={r.fillerWordCount ?? 0}
        grade={r.grade}
      />
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Chưa có dữ liệu chi tiết cho lượt làm bài này.
    </p>
  );
}
