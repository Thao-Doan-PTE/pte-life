import { toPteScore, clampPct, type ScoreResult } from "@/lib/scoring/types";
import type { BlankSegment } from "@/components/practice/dropdown-blanks";

export function scoreSingleChoice(
  correctIndex: number,
  selected: number[]
): ScoreResult {
  const isCorrect = selected.length === 1 && selected[0] === correctIndex;
  const scorePct = isCorrect ? 100 : 0;
  return {
    scorePct,
    pteScore: toPteScore(scorePct),
    correct: isCorrect,
    reveal: { correctIndexes: [correctIndex] },
  };
}

/** Cộng điểm cho lựa chọn đúng, trừ điểm cho lựa chọn sai — giống cách PTE chấm multi-select. */
export function scoreMultipleChoice(
  correctIndexes: number[],
  selected: number[]
): ScoreResult {
  const correctSet = new Set(correctIndexes);
  const correctPicks = selected.filter((i) => correctSet.has(i)).length;
  const wrongPicks = selected.filter((i) => !correctSet.has(i)).length;
  const scorePct = clampPct(
    (correctPicks - wrongPicks) / (correctIndexes.length || 1)
  );
  return {
    scorePct,
    pteScore: toPteScore(scorePct),
    correct: scorePct === 100,
    reveal: { correctIndexes },
  };
}

export function scoreBlanks(
  segments: BlankSegment[],
  answers: Record<string, string>
): ScoreResult {
  const blanks = segments.filter((s) => s.type === "blank");
  const total = blanks.length || 1;
  let correctCount = 0;
  const correctAnswers: Record<string, string> = {};

  for (const b of blanks) {
    correctAnswers[b.id!] = b.correctAnswer ?? "";
    const userAnswer = (answers[b.id!] ?? "").trim().toLowerCase();
    const expected = (b.correctAnswer ?? "").trim().toLowerCase();
    if (userAnswer.length > 0 && userAnswer === expected) correctCount++;
  }

  const scorePct = Math.round((correctCount / total) * 100);
  return {
    scorePct,
    pteScore: toPteScore(scorePct),
    correct: scorePct === 100,
    reveal: { correctAnswers },
  };
}

export function scoreReorder(
  correctOrder: string[],
  userOrder: string[]
): ScoreResult {
  const total = correctOrder.length || 1;
  let correctCount = 0;
  for (let i = 0; i < correctOrder.length; i++) {
    if (userOrder[i] === correctOrder[i]) correctCount++;
  }
  const scorePct = Math.round((correctCount / total) * 100);
  return {
    scorePct,
    pteScore: toPteScore(scorePct),
    correct: scorePct === 100,
    reveal: { correctOrder },
  };
}

export interface DictationWordDiff {
  word: string;
  status: "correct" | "wrong" | "missing";
}

function normalizeWord(w: string) {
  return w.replace(/[.,!?;:"']/g, "").toLowerCase();
}

export function scoreDictation(
  referenceSentence: string,
  userAnswer: string
): ScoreResult {
  const refWords = referenceSentence.trim().split(/\s+/);
  const userWordsNormalized = userAnswer
    .trim()
    .split(/\s+/)
    .map(normalizeWord);

  let correctCount = 0;
  const diff: DictationWordDiff[] = refWords.map((word, i) => {
    const isCorrect =
      userWordsNormalized[i] !== undefined &&
      userWordsNormalized[i] === normalizeWord(word);
    if (isCorrect) correctCount++;
    return {
      word,
      status: isCorrect ? "correct" : userWordsNormalized[i] ? "wrong" : "missing",
    };
  });

  const scorePct = Math.round((correctCount / (refWords.length || 1)) * 100);
  return {
    scorePct,
    pteScore: toPteScore(scorePct),
    correct: scorePct === 100,
    reveal: { referenceSentence, diff },
  };
}

export function scoreHighlightWords(
  incorrectIndexes: number[],
  selectedIndexes: number[]
): ScoreResult {
  const result = scoreMultipleChoice(incorrectIndexes, selectedIndexes);
  return { ...result, reveal: { incorrectIndexes } };
}

/** Điều phối chấm điểm rule-based theo questionTypeId. Ném lỗi nếu dạng chưa hỗ trợ
 * (Writing/Speaking cần AI — xem Bước 7-8). */
export function scoreAttempt(
  questionTypeId: string,
  content: Record<string, unknown>,
  response: unknown
): ScoreResult {
  switch (questionTypeId) {
    case "reading-mcq-single":
    case "listening-mcq-single":
    case "highlight-correct-summary":
    case "select-missing-word":
      return scoreSingleChoice(content.correctIndex as number, response as number[]);

    case "reading-mcq-multiple":
    case "listening-mcq-multiple":
      return scoreMultipleChoice(
        content.correctIndexes as number[],
        response as number[]
      );

    case "reading-fill-blanks-dropdown":
    case "reading-fill-blanks-drag-drop":
    case "listening-fill-blanks":
      return scoreBlanks(
        content.segments as BlankSegment[],
        response as Record<string, string>
      );

    case "reorder-paragraphs":
      return scoreReorder(content.correctOrder as string[], response as string[]);

    case "write-from-dictation":
      return scoreDictation(content.sentence as string, response as string);

    case "highlight-incorrect-words":
      return scoreHighlightWords(
        content.incorrectIndexes as number[],
        response as number[]
      );

    default:
      throw new Error(
        `Dạng câu hỏi "${questionTypeId}" chưa hỗ trợ chấm rule-based (cần AI — Bước 7-8).`
      );
  }
}

export const RULE_BASED_TYPE_IDS = new Set([
  "reading-mcq-single",
  "reading-mcq-multiple",
  "reading-fill-blanks-dropdown",
  "reading-fill-blanks-drag-drop",
  "reorder-paragraphs",
  "listening-mcq-single",
  "listening-mcq-multiple",
  "listening-fill-blanks",
  "highlight-correct-summary",
  "select-missing-word",
  "highlight-incorrect-words",
  "write-from-dictation",
]);
