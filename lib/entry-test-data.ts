/**
 * Nội dung "Test đầu vào PTE" v1 — port từ gói bàn giao
 * PTE_TestDauVao_Package (SPEC_TestDauVao_PTE.md + questions.json), 02/10/2026.
 *
 * Đây là 1 đề cố định (26 câu, 40 phút), CHƯA được học thuật duyệt (xem mục 8
 * của spec): đáp án Word/Reading là đề xuất, Listening CHƯA có đáp án lẫn file
 * audio trong gói này nên tạm để `answer: null` (chờ giáo viên nghe file gốc
 * "Audio file test.mp3" và điền) — giữ nguyên trạng thái "chờ chấm" như
 * Speaking cho tới khi có dữ liệu thật, không tự bịa đáp án.
 */

export type EntryTestQuestionType =
  | "read_aloud"
  | "mcq"
  | "word_form"
  | "reorder"
  | "dropdown_gap"
  | "gap_fill"
  | "short_answer";

export interface EntryTestQuestionBase {
  id: string;
  type: EntryTestQuestionType;
  points: number;
}

export interface ReadAloudQuestion extends EntryTestQuestionBase {
  type: "read_aloud";
  instructionEn: string;
  instructionVi: string;
  text: string;
  answerSeconds: number;
}

export interface McqQuestion extends EntryTestQuestionBase {
  type: "mcq";
  stem: string;
  options: Record<string, string>;
  answer: string;
}

export interface WordFormQuestion extends EntryTestQuestionBase {
  type: "word_form";
  stem: string;
  root: string;
  answer: string[];
}

export interface ReorderQuestion extends EntryTestQuestionBase {
  type: "reorder";
  stem: string;
  answer: string[];
}

export interface DropdownGapQuestion extends EntryTestQuestionBase {
  type: "dropdown_gap";
  answer: string | null;
}

export interface GapFillQuestion extends EntryTestQuestionBase {
  type: "gap_fill";
  stem: string;
  maxWords: number;
  answer: string[] | null;
}

export interface ShortAnswerQuestion extends EntryTestQuestionBase {
  type: "short_answer";
  stem: string;
  maxWords: number;
  answer: string[] | null;
}

export type EntryTestQuestion =
  | ReadAloudQuestion
  | McqQuestion
  | WordFormQuestion
  | ReorderQuestion
  | DropdownGapQuestion
  | GapFillQuestion
  | ShortAnswerQuestion;

export type EntryTestSectionKey = "speaking" | "word" | "reading" | "listening";

export interface EntryTestSection {
  key: EntryTestSectionKey;
  order: number;
  name: string;
  nameVi: string;
  pointsLabel: number;
  instructionEn?: string;
  instructionVi?: string;
  passageTitle?: string;
  wordBank?: string[];
  passage?: string;
  audioUrl?: string;
  items: EntryTestQuestion[];
}

export const ENTRY_TEST_DURATION_MINUTES = 40;
/** Số lần tối đa học viên được nghe file audio phần Listening. */
export const ENTRY_TEST_LISTENING_MAX_PLAYS = 2;

export const ENTRY_TEST_SECTIONS: EntryTestSection[] = [
  {
    key: "speaking",
    order: 1,
    name: "Speaking",
    nameVi: "Kỹ năng nói",
    pointsLabel: 30,
    items: [
      {
        id: "S1",
        type: "read_aloud",
        points: 15,
        answerSeconds: 40,
        instructionEn: "Read aloud the text below. You have 40 seconds to read your text aloud.",
        instructionVi: "Đọc to đoạn văn dưới đây. Bạn có 40 giây để đọc. Ghi âm và gửi lại câu trả lời của bạn.",
        text: "Cultural identity is shaped by a variety of factors, including social norms and values. To maintain cultural integrity and function, members must conform to these norms and values. However, conformity can also limit individual expression and creativity. Balancing cultural conformity with personal identity and autonomy is a complex process that requires ongoing negotiation and reflection.",
      },
    ],
  },
  {
    key: "word",
    order: 2,
    name: "Word",
    nameVi: "Từ vựng - ngữ pháp",
    pointsLabel: 20,
    items: [
      {
        id: "W1",
        type: "mcq",
        points: 2,
        stem: "Ann ________ a dress for herself at the moment. She always ________ all her own clothes.",
        options: { A: "is making - makes", B: "make - is making", C: "is making - made", D: "has made - is making" },
        answer: "A",
      },
      {
        id: "W2",
        type: "mcq",
        points: 2,
        stem: "While I _______ for the final examination, my dad _______ to visit me.",
        options: { A: "practiced - come", B: "practicing - is coming", C: "was practicing - came", D: "practiced - came" },
        answer: "C",
      },
      {
        id: "W3",
        type: "mcq",
        points: 2,
        stem: "I ________ a larger model if I had had enough money.",
        options: { A: "would had bought", B: "has been bought", C: "had bought", D: "would have bought" },
        answer: "D",
      },
      {
        id: "W4",
        type: "mcq",
        points: 2,
        stem: "Your homework ________ by tomorrow afternoon.",
        options: { A: "must finish", B: "must be finished", C: "must be finishing", D: "must finished" },
        answer: "B",
      },
      {
        id: "W5",
        type: "mcq",
        points: 2,
        stem: "Nobody in my class is ______ smart ______ An.",
        options: { A: "as/as", B: "more/than", C: "more/as", D: "the/more" },
        answer: "A",
      },
      { id: "W6", type: "word_form", points: 2, stem: "We had to get special ________ to leave early.", root: "PERMIT", answer: ["permission"] },
      { id: "W7", type: "word_form", points: 2, stem: "They have a wonderful ________ of stamps.", root: "COLLECT", answer: ["collection"] },
      {
        id: "W8",
        type: "word_form",
        points: 2,
        stem: "He gave us a detailed ________ of how the accident happened.",
        root: "DESCRIBE",
        answer: ["description"],
      },
      {
        id: "W9",
        type: "reorder",
        points: 2,
        stem: "to / be / her / Anna / the / hard / class / is / working / in / order / best / in",
        answer: ["Anna is working hard in order to be the best in her class."],
      },
      {
        id: "W10",
        type: "reorder",
        points: 2,
        stem: "he / while / himself / the car / hurt / Sandy / was repairing",
        answer: ["Sandy hurt himself while he was repairing the car."],
      },
    ],
  },
  {
    key: "reading",
    order: 3,
    name: "Reading",
    nameVi: "Kỹ năng đọc hiểu",
    pointsLabel: 20,
    instructionVi: "Chọn từ phù hợp điền vào chỗ trống (mỗi từ dùng tối đa 1 lần).",
    passageTitle: "The Coconut Tree",
    wordBank: ["shade", "view", "climate", "separate", "weather", "uses", "shadow", "look", "different", "travel"],
    passage:
      "The coconut tree is thought to be one of the most valuable trees in the world. It is mostly found by the sea where there is a hot and wet {R1}. The coconuts often fall into the sea and float on the water until they reach another beach, where more trees then begin to grow.\n\nHoliday makers often see the coconut tree as no more than an attractive sun umbrella that provides {R2}. However, this amazing tree has hundreds of {R3} and more are still being discovered.\n\nPeople have made houses, boats and baskets from the coconut tree's wood and leaves for centuries. Even today, if you take a {R4} in your cupboards, you will find coconut oil in products as {R5} as medicine and desserts.",
    items: [
      { id: "R1", type: "dropdown_gap", points: 4, answer: "climate" },
      { id: "R2", type: "dropdown_gap", points: 4, answer: "shade" },
      { id: "R3", type: "dropdown_gap", points: 4, answer: "uses" },
      { id: "R4", type: "dropdown_gap", points: 4, answer: "look" },
      { id: "R5", type: "dropdown_gap", points: 4, answer: "different" },
    ],
  },
  {
    key: "listening",
    order: 4,
    name: "Listening",
    nameVi: "Kỹ năng nghe",
    pointsLabel: 30,
    audioUrl: "/audio/entry-test-listening.mp3",
    instructionEn: "Complete the form below. Write no more than three words or a number.",
    instructionVi: "Hoàn thành biểu mẫu dưới đây với không quá 3 từ/1 số.",
    items: [
      { id: "L1", type: "gap_fill", points: 3, stem: "First name: (1) ________", maxWords: 3, answer: null },
      { id: "L2", type: "gap_fill", points: 3, stem: "Passport number: (2) ________", maxWords: 3, answer: null },
      { id: "L3", type: "gap_fill", points: 3, stem: "Length of homestay: Approximately (3) ________", maxWords: 3, answer: null },
      { id: "L4", type: "gap_fill", points: 3, stem: "Course enrolled in: (4) ________", maxWords: 3, answer: null },
      { id: "L5", type: "gap_fill", points: 3, stem: "Family preferences: no (5) ________", maxWords: 3, answer: null },
      { id: "L6", type: "gap_fill", points: 3, stem: "Family preferences: no objection to (6) ________", maxWords: 3, answer: null },
      { id: "L7", type: "short_answer", points: 3, stem: "What does the student particularly like to eat?", maxWords: 2, answer: null },
      { id: "L8", type: "short_answer", points: 3, stem: "What sport does the student play?", maxWords: 2, answer: null },
      { id: "L9", type: "short_answer", points: 3, stem: "What mode of transport does the student prefer?", maxWords: 2, answer: null },
      { id: "L10", type: "short_answer", points: 3, stem: "When will the student find out her homestay address?", maxWords: 2, answer: null },
    ],
  },
];

export interface LevelBand {
  minPct: number;
  level: string;
  suggestion: string;
}

/** Ngưỡng xếp trình độ — ĐỀ XUẤT, cần học thuật duyệt (mục 7 của spec). */
export const ENTRY_TEST_LEVEL_BANDS: LevelBand[] = [
  { minPct: 80, level: "Mục tiêu PTE 65+", suggestion: "Khóa PTE nâng cao / luyện đề tủ" },
  { minPct: 60, level: "Mục tiêu PTE 50–58", suggestion: "Khóa PTE trung cấp" },
  { minPct: 40, level: "Mục tiêu PTE 30–42", suggestion: "Khóa PTE cơ bản" },
  { minPct: 0, level: "Nền tảng", suggestion: "Khóa nền tảng trước khi luyện PTE" },
];

export function getAllEntryTestQuestions(): EntryTestQuestion[] {
  return ENTRY_TEST_SECTIONS.flatMap((s) => s.items);
}

export function findEntryTestQuestion(id: string): EntryTestQuestion | undefined {
  return getAllEntryTestQuestions().find((q) => q.id === id);
}
