export type Skill = "speaking" | "writing" | "reading" | "listening";

export type ExamPackage = "academic" | "core";

/**
 * Bảng tỉ trọng chấm điểm (overallWeightPct / skillWeightPct / weighting) lấy từ
 * https://ptescoreup.com/student/practice/weighting — số liệu chính thức PTE Academic
 * (% đóng góp của từng dạng câu vào điểm Overall và vào từng điểm kỹ năng giao tiếp:
 * Listening/Reading/Speaking/Writing). Riêng phần PTE Core (availableIn) vẫn dựa theo
 * hiểu biết chung về cấu trúc bài thi — đội nội dung PTE-Life xác nhận lại nếu cần.
 */
export interface QuestionTypeWeighting {
  overall: number;
  listening: number;
  reading: number;
  speaking: number;
  writing: number;
}

export interface QuestionType {
  id: string;
  skill: Skill;
  name: string;
  nameEn: string;
  /** Mã viết tắt chuẩn PTE, ví dụ "RA", "FIB-RW", "WFD". */
  code: string;
  /** Mô tả ngắn gọn bằng tiếng Việt cho dạng câu hỏi. */
  descriptionVi: string;
  availableIn: ExamPackage[];
  overallWeightPct: number | null;
  skillWeightPct: number | null;
  weighting: QuestionTypeWeighting | null;
}

export const SKILL_LABELS: Record<Skill, string> = {
  speaking: "Speaking",
  writing: "Writing",
  reading: "Reading",
  listening: "Listening",
};

export const QUESTION_TYPES: QuestionType[] = [
  // Speaking (7)
  {
    id: "read-aloud",
    skill: "speaking",
    name: "Read Aloud",
    nameEn: "Read Aloud",
    code: "RA",
    descriptionVi: "Đọc to đoạn văn hiển thị trên màn hình",
    availableIn: ["academic", "core"],
    overallWeightPct: 4,
    skillWeightPct: 9,
    weighting: { overall: 4, listening: 0, reading: 0, speaking: 9, writing: 0 },
  },
  {
    id: "repeat-sentence",
    skill: "speaking",
    name: "Repeat Sentence",
    nameEn: "Repeat Sentence",
    code: "RS",
    descriptionVi: "Lặp lại câu nghe được",
    availableIn: ["academic", "core"],
    overallWeightPct: 7,
    skillWeightPct: 16,
    weighting: { overall: 7, listening: 17, reading: 0, speaking: 16, writing: 0 },
  },
  {
    id: "describe-image",
    skill: "speaking",
    name: "Describe Image",
    nameEn: "Describe Image",
    code: "DI",
    descriptionVi: "Miêu tả hình ảnh",
    availableIn: ["academic"],
    overallWeightPct: 15,
    skillWeightPct: 31,
    weighting: { overall: 15, listening: 0, reading: 0, speaking: 31, writing: 0 },
  },
  {
    id: "retell-lecture",
    skill: "speaking",
    name: "Retell Lecture",
    nameEn: "Retell Lecture",
    code: "RL",
    descriptionVi: "Kể lại bài giảng",
    availableIn: ["academic"],
    overallWeightPct: 6,
    skillWeightPct: 13,
    weighting: { overall: 6, listening: 13, reading: 0, speaking: 13, writing: 0 },
  },
  {
    id: "answer-short-question",
    skill: "speaking",
    name: "Answer Short Question",
    nameEn: "Answer Short Question",
    code: "ASQ",
    descriptionVi: "Trả lời câu hỏi ngắn",
    availableIn: ["academic", "core"],
    overallWeightPct: 2,
    skillWeightPct: 1,
    weighting: { overall: 2, listening: 4, reading: 0, speaking: 1, writing: 0 },
  },
  {
    id: "summarize-group-discussion",
    skill: "speaking",
    name: "Summarize Group Discussion",
    nameEn: "Summarize Group Discussion",
    code: "SGD",
    descriptionVi: "Tóm tắt thảo luận nhóm",
    availableIn: ["core"],
    overallWeightPct: 9,
    skillWeightPct: 19,
    weighting: { overall: 9, listening: 20, reading: 0, speaking: 19, writing: 0 },
  },
  {
    id: "respond-to-situation",
    skill: "speaking",
    name: "Respond to Situation",
    nameEn: "Respond to Situation",
    code: "RTS",
    descriptionVi: "Xử lý tình huống nói",
    availableIn: ["core"],
    overallWeightPct: 6,
    skillWeightPct: 13,
    weighting: { overall: 6, listening: 0, reading: 0, speaking: 13, writing: 0 },
  },

  // Writing (2)
  {
    id: "summarize-written-text",
    skill: "writing",
    name: "Summarize Written Text",
    nameEn: "Summarize Written Text",
    code: "SWT",
    descriptionVi: "Tóm tắt văn bản bằng 1 câu viết",
    availableIn: ["academic"],
    overallWeightPct: 7,
    skillWeightPct: 28,
    weighting: { overall: 7, listening: 0, reading: 23, speaking: 0, writing: 28 },
  },
  {
    id: "write-essay",
    skill: "writing",
    name: "Write Essay",
    nameEn: "Write Essay",
    code: "WE",
    descriptionVi: "Viết luận",
    availableIn: ["academic"],
    overallWeightPct: 7,
    skillWeightPct: 31,
    weighting: { overall: 7, listening: 0, reading: 0, speaking: 0, writing: 31 },
  },

  // Reading (5)
  {
    id: "reading-fill-blanks-dropdown",
    skill: "reading",
    name: "Fill in the Blanks (Dropdown)",
    nameEn: "Fill in the Blanks (Dropdown)",
    code: "FIB-RW",
    descriptionVi: "Điền vào chỗ trống (cả Đọc và Viết)",
    availableIn: ["academic", "core"],
    overallWeightPct: 7,
    skillWeightPct: 25,
    weighting: { overall: 7, listening: 0, reading: 25, speaking: 0, writing: 0 },
  },
  {
    id: "reading-mcq-multiple",
    skill: "reading",
    name: "Multiple Choice (Multiple Answer)",
    nameEn: "Multiple Choice (Multiple Answer)",
    code: "MCMA-R",
    descriptionVi: "Trắc nghiệm nhiều đáp án đúng",
    availableIn: ["academic", "core"],
    overallWeightPct: 1,
    skillWeightPct: 5,
    weighting: { overall: 1, listening: 0, reading: 5, speaking: 0, writing: 0 },
  },
  {
    id: "reorder-paragraphs",
    skill: "reading",
    name: "Reorder Paragraphs",
    nameEn: "Reorder Paragraphs",
    code: "RO",
    descriptionVi: "Sắp xếp lại đoạn văn",
    availableIn: ["academic", "core"],
    overallWeightPct: 3,
    skillWeightPct: 9,
    weighting: { overall: 3, listening: 0, reading: 9, speaking: 0, writing: 0 },
  },
  {
    id: "reading-fill-blanks-drag-drop",
    skill: "reading",
    name: "Fill in the Blanks (Drag and Drop)",
    nameEn: "Fill in the Blanks (Drag and Drop)",
    code: "FIB-R",
    descriptionVi: "Điền vào chỗ trống dạng kéo thả",
    availableIn: ["academic", "core"],
    overallWeightPct: 6,
    skillWeightPct: 20,
    weighting: { overall: 6, listening: 0, reading: 20, speaking: 0, writing: 0 },
  },
  {
    id: "reading-mcq-single",
    skill: "reading",
    name: "Multiple Choice (Single Answer)",
    nameEn: "Multiple Choice (Single Answer)",
    code: "MCSA-R",
    descriptionVi: "Trắc nghiệm một đáp án đúng",
    availableIn: ["academic", "core"],
    overallWeightPct: 0,
    skillWeightPct: 3,
    weighting: { overall: 0, listening: 0, reading: 3, speaking: 0, writing: 0 },
  },

  // Listening (8)
  {
    id: "summarize-spoken-text",
    skill: "listening",
    name: "Summarize Spoken Text",
    nameEn: "Summarize Spoken Text",
    code: "SST",
    descriptionVi: "Tóm tắt đoạn ghi âm nghe được",
    availableIn: ["academic"],
    overallWeightPct: 4,
    skillWeightPct: 10,
    weighting: { overall: 4, listening: 10, reading: 0, speaking: 0, writing: 18 },
  },
  {
    id: "listening-mcq-multiple",
    skill: "listening",
    name: "Multiple Choice (Multiple Answer)",
    nameEn: "Multiple Choice (Multiple Answer)",
    code: "MCMA-L",
    descriptionVi: "Trắc nghiệm nghe nhiều đáp án đúng",
    availableIn: ["academic", "core"],
    overallWeightPct: 1,
    skillWeightPct: 3,
    weighting: { overall: 1, listening: 3, reading: 0, speaking: 0, writing: 0 },
  },
  {
    id: "listening-fill-blanks",
    skill: "listening",
    name: "Fill in the Blanks",
    nameEn: "Fill in the Blanks",
    code: "FIB-L",
    descriptionVi: "Điền từ còn thiếu vào ô trống khi nghe",
    availableIn: ["academic", "core"],
    overallWeightPct: 3,
    skillWeightPct: 8,
    weighting: { overall: 3, listening: 8, reading: 0, speaking: 0, writing: 0 },
  },
  {
    id: "highlight-correct-summary",
    skill: "listening",
    name: "Highlight Correct Summary",
    nameEn: "Highlight Correct Summary",
    code: "HCS",
    descriptionVi: "Chọn bản tóm tắt đúng nhất",
    availableIn: ["academic"],
    overallWeightPct: 0,
    skillWeightPct: 2,
    weighting: { overall: 0, listening: 2, reading: 3, speaking: 0, writing: 0 },
  },
  {
    id: "listening-mcq-single",
    skill: "listening",
    name: "Multiple Choice (Single Answer)",
    nameEn: "Multiple Choice (Single Answer)",
    code: "MCSA-L",
    descriptionVi: "Trắc nghiệm nghe một đáp án đúng",
    availableIn: ["academic", "core"],
    overallWeightPct: 0,
    skillWeightPct: 2,
    weighting: { overall: 0, listening: 2, reading: 0, speaking: 0, writing: 0 },
  },
  {
    id: "select-missing-word",
    skill: "listening",
    name: "Select Missing Word",
    nameEn: "Select Missing Word",
    code: "SMW",
    descriptionVi: "Chọn từ bị thiếu ở cuối đoạn audio",
    availableIn: ["academic"],
    overallWeightPct: 1,
    skillWeightPct: 1,
    weighting: { overall: 1, listening: 1, reading: 0, speaking: 0, writing: 0 },
  },
  {
    id: "highlight-incorrect-words",
    skill: "listening",
    name: "Highlight Incorrect Words",
    nameEn: "Highlight Incorrect Words",
    code: "HIW",
    descriptionVi: "Chỉ ra từ đọc sai khác so với văn bản",
    availableIn: ["academic"],
    overallWeightPct: 4,
    skillWeightPct: 8,
    weighting: { overall: 4, listening: 8, reading: 13, speaking: 0, writing: 0 },
  },
  {
    id: "write-from-dictation",
    skill: "listening",
    name: "Write from Dictation",
    nameEn: "Write from Dictation",
    code: "WFD",
    descriptionVi: "Nghe và viết lại câu",
    availableIn: ["academic", "core"],
    overallWeightPct: 5,
    skillWeightPct: 13,
    weighting: { overall: 5, listening: 13, reading: 0, speaking: 0, writing: 23 },
  },
];

export function getQuestionTypesBySkill(skill: Skill): QuestionType[] {
  return QUESTION_TYPES.filter((q) => q.skill === skill);
}

export function getQuestionTypesForPackage(pkg: ExamPackage): QuestionType[] {
  return QUESTION_TYPES.filter((q) => q.availableIn.includes(pkg));
}
