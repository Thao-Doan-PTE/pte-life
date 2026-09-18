import type { ExamPackage, Skill } from "@/lib/question-types";

export interface ImportSchema {
  questionTypeId: string;
  skill: Skill;
  /** Tên cột trong file CSV (không tính "code" và "available_in", được xử lý chung). */
  columns: string[];
  example: string[];
  notes: string;
  /** Tiền tố mã câu dùng trong file mẫu (vd "WFD"). Mặc định lấy 4 ký tự đầu của questionTypeId nếu không set. */
  codePrefix?: string;
  parseContent(record: Record<string, string>):
    | { content: Record<string, unknown> }
    | { error: string };
}

type ParseResult<T> = { value: T } | { error: string };

export function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseAvailableIn(value: string): ParseResult<ExamPackage[]> {
  const parts = splitList(value.toLowerCase());
  if (parts.length === 0) {
    return { error: 'available_in không được để trống (vd: "academic,core")' };
  }
  const result: ExamPackage[] = [];
  for (const p of parts) {
    if (p !== "academic" && p !== "core") {
      return { error: `available_in không hợp lệ: "${p}" (chỉ chấp nhận academic/core)` };
    }
    result.push(p as ExamPackage);
  }
  return { value: result };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleDistinct<T>(arr: T[]): T[] {
  if (arr.length <= 1) return [...arr];
  let result = shuffle(arr);
  let attempts = 0;
  while (result.every((v, i) => v === arr[i]) && attempts < 5) {
    result = shuffle(arr);
    attempts++;
  }
  return result;
}

function collectOptions(record: Record<string, string>, max: number): string[] {
  const options: string[] = [];
  for (let i = 1; i <= max; i++) {
    const v = record[`option_${i}`];
    if (v) options.push(v);
  }
  return options;
}

const MAX_OPTIONS = 6;
const MAX_PARAGRAPHS = 6;

function buildMcqSingleSchema(
  questionTypeId: string,
  skill: Skill,
  sourceField: "passage" | "audio_url"
): ImportSchema {
  return {
    questionTypeId,
    skill,
    columns: [
      sourceField,
      "question",
      "question_vi",
      ...Array.from({ length: MAX_OPTIONS }, (_, i) => `option_${i + 1}`),
      "correct_option",
    ],
    example:
      sourceField === "passage"
        ? [
            "Urban beekeeping has grown in popularity over the past decade...",
            "What is the main idea of the passage?",
            "Ý chính của đoạn văn là gì?",
            "Beekeeping is banned in most cities.",
            "Urban beekeeping has become more common as a way to support ecosystems.",
            "Rooftop gardens are more popular than parks.",
            "Cities are removing green spaces.",
            "",
            "",
            "2",
          ]
        : [
            "https://example.com/audio/lms-009.mp3",
            "What was the main driver of the revenue increase?",
            "Yếu tố chính thúc đẩy doanh thu tăng là gì?",
            "Strong sales in the technology division.",
            "A reduction in operating costs.",
            "Higher prices in the retail division.",
            "An increase in overseas investment.",
            "",
            "",
            "1",
          ],
    notes:
      "correct_option là số thứ tự đáp án đúng (1 = option_1, 2 = option_2, ...). Chỉ cần điền tối thiểu 2 đáp án, để trống các option_ không dùng. question_vi (bản dịch tiếng Việt của câu hỏi) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      const source = record[sourceField];
      if (!source) return { error: `Thiếu ${sourceField}` };
      const question = record.question;
      if (!question) return { error: "Thiếu question" };
      const options = collectOptions(record, MAX_OPTIONS);
      if (options.length < 2) {
        return { error: "Cần ít nhất 2 đáp án (option_1, option_2, ...)" };
      }
      const correctNum = Number(record.correct_option);
      if (!Number.isInteger(correctNum) || correctNum < 1 || correctNum > options.length) {
        return { error: `correct_option phải là số từ 1 đến ${options.length}` };
      }
      const key = sourceField === "passage" ? "passage" : "audioUrl";
      const content: Record<string, unknown> = {
        [key]: source,
        question,
        options,
        correctIndex: correctNum - 1,
      };
      if (record.question_vi) content.questionVi = record.question_vi;
      return { content };
    },
  };
}

function buildMcqMultiSchema(
  questionTypeId: string,
  skill: Skill,
  sourceField: "passage" | "audio_url"
): ImportSchema {
  return {
    questionTypeId,
    skill,
    columns: [
      sourceField,
      "question",
      "question_vi",
      ...Array.from({ length: MAX_OPTIONS }, (_, i) => `option_${i + 1}`),
      "correct_options",
      "max_selectable",
    ],
    example:
      sourceField === "passage"
        ? [
            "The Great Barrier Reef, located off the coast of Australia...",
            "Theo đoạn văn, ý nào sau đây ĐÚNG?",
            "",
            "The Great Barrier Reef is located off the coast of Australia.",
            "The reef is home to thousands of marine species.",
            "Coral bleaching has improved the reef's biodiversity.",
            "Conservation efforts focus only on tourism.",
            "",
            "",
            "1,2",
            "2",
          ]
        : [
            "https://example.com/audio/lmm-006.mp3",
            "Những lợi ích nào của việc tập thể dục được nhắc đến?",
            "",
            "Improved cardiovascular health",
            "Better mood",
            "Increased height",
            "Stronger muscles",
            "Better eyesight",
            "",
            "1,2,4",
            "3",
          ],
    notes:
      "correct_options liệt kê các số thứ tự đáp án đúng, cách nhau bởi dấu phẩy (vd: 1,3). max_selectable để trống sẽ tự lấy đúng bằng số đáp án đúng. question_vi (bản dịch tiếng Việt của câu hỏi) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      const source = record[sourceField];
      if (!source) return { error: `Thiếu ${sourceField}` };
      const question = record.question;
      if (!question) return { error: "Thiếu question" };
      const options = collectOptions(record, MAX_OPTIONS);
      if (options.length < 2) {
        return { error: "Cần ít nhất 2 đáp án (option_1, option_2, ...)" };
      }
      const nums = splitList(record.correct_options).map(Number);
      if (nums.length === 0 || nums.some((n) => !Number.isInteger(n) || n < 1 || n > options.length)) {
        return {
          error: `correct_options phải là danh sách số từ 1 đến ${options.length}, cách nhau bởi dấu phẩy`,
        };
      }
      const correctIndexes = Array.from(new Set(nums.map((n) => n - 1))).sort((a, b) => a - b);
      let maxSelectable = correctIndexes.length;
      if (record.max_selectable) {
        const m = Number(record.max_selectable);
        if (!Number.isInteger(m) || m < correctIndexes.length) {
          return { error: `max_selectable phải là số nguyên >= ${correctIndexes.length}` };
        }
        maxSelectable = m;
      }
      const key = sourceField === "passage" ? "passage" : "audioUrl";
      const content: Record<string, unknown> = {
        [key]: source,
        question,
        options,
        correctIndexes,
        maxSelectable,
      };
      if (record.question_vi) content.questionVi = record.question_vi;
      return { content };
    },
  };
}

function buildAudioTextSchema(
  questionTypeId: string,
  skill: Skill,
  contentKey: string,
  columnLabel: string,
  example: [string, string],
  exampleVi?: string,
  requireAudio: boolean = true
): ImportSchema {
  const viColumn = `${columnLabel}_vi`;
  const [audioExample, textExample] = example;
  const columns = requireAudio ? ["audio_url", columnLabel, viColumn] : [columnLabel, viColumn];
  const exampleRow = requireAudio
    ? [audioExample, textExample, exampleVi ?? ""]
    : [textExample, exampleVi ?? ""];
  const notes = requireAudio
    ? `audio_url là link file audio công khai (Google Drive/CDN...), phải nghe/truy cập được trực tiếp. ${viColumn} (bản dịch tiếng Việt) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.`
    : `Không cần audio_url — hệ thống tự đọc câu tiếng Anh bằng giọng đọc máy (text-to-speech) khi học viên bấm nghe. ${viColumn} (bản dịch tiếng Việt) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.`;
  return {
    questionTypeId,
    skill,
    columns,
    example: exampleRow,
    notes,
    parseContent(record) {
      if (requireAudio && !record.audio_url) return { error: "Thiếu audio_url" };
      const text = record[columnLabel];
      if (!text) return { error: `Thiếu ${columnLabel}` };
      const content: Record<string, unknown> = { [contentKey]: text };
      if (requireAudio) content.audioUrl = record.audio_url;
      const vi = record[viColumn];
      if (vi) content[`${contentKey}Vi`] = vi;
      return { content };
    },
  };
}

function parsePlainBlanks(
  text: string
): { segments: Record<string, unknown>[] } | { error: string } {
  const parts = text.split(/\[\[(.+?)\]\]/g);
  const segments: Record<string, unknown>[] = [];
  let blankCount = 0;
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      if (part) segments.push({ type: "text", value: part });
    } else {
      blankCount++;
      segments.push({ type: "blank", id: `b${blankCount}`, correctAnswer: part.trim() });
    }
  });
  if (blankCount === 0) {
    return { error: "Không tìm thấy chỗ trống nào. Dùng cú pháp [[đáp_án]] để đánh dấu chỗ trống." };
  }
  return { segments };
}

const PASSAGE_WITH_BLANKS_NOTE_PLAIN =
  'Dùng cú pháp [[đáp_án]] ngay trong câu để đánh dấu chỗ trống, vd: "The seminar will start at [[nine o\'clock]] and run for [[three hours]]."';

function buildBlanksDragDropSchema(): ImportSchema {
  return {
    questionTypeId: "reading-fill-blanks-drag-drop",
    skill: "reading",
    columns: ["passage_with_blanks", "word_bank", "passage_vi"],
    example: [
      "The museum's new exhibit features artifacts from ancient Egypt. Visitors can [[view]] rare pottery, jewelry, and tools. The exhibit will remain [[open]] until the end of the year.",
      "view,open,closed,ignore",
      "Triển lãm mới của bảo tàng trưng bày các hiện vật từ Ai Cập cổ đại. Du khách có thể xem đồ gốm, trang sức và công cụ quý hiếm. Triển lãm sẽ mở cửa đến cuối năm.",
    ],
    notes:
      PASSAGE_WITH_BLANKS_NOTE_PLAIN +
      " word_bank liệt kê tất cả từ để kéo-thả (gồm cả đáp án đúng lẫn từ gây nhiễu), cách nhau bởi dấu phẩy. passage_vi (bản dịch tiếng Việt cả đoạn) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      const parsed = parsePlainBlanks(record.passage_with_blanks ?? "");
      if ("error" in parsed) return parsed;
      const answers = parsed.segments
        .filter((s) => s.type === "blank")
        .map((s) => s.correctAnswer as string);
      const bankInput = splitList(record.word_bank ?? "");
      const bank = Array.from(new Set([...bankInput, ...answers]));
      const content: Record<string, unknown> = {
        segments: parsed.segments,
        wordBank: shuffleDistinct(bank),
      };
      if (record.passage_vi) content.passageVi = record.passage_vi;
      return { content };
    },
  };
}

function buildListeningFillBlanksSchema(): ImportSchema {
  return {
    questionTypeId: "listening-fill-blanks",
    skill: "listening",
    columns: ["audio_url", "passage_with_blanks", "passage_vi"],
    example: [
      "https://example.com/audio/lfb-010.mp3",
      "The seminar will start at [[nine o'clock]] and will run for approximately [[three hours]].",
      "Buổi hội thảo sẽ bắt đầu lúc chín giờ và kéo dài khoảng ba tiếng.",
    ],
    notes:
      PASSAGE_WITH_BLANKS_NOTE_PLAIN +
      " passage_vi (bản dịch tiếng Việt cả câu) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      if (!record.audio_url) return { error: "Thiếu audio_url" };
      const parsed = parsePlainBlanks(record.passage_with_blanks ?? "");
      if ("error" in parsed) return parsed;
      const content: Record<string, unknown> = {
        audioUrl: record.audio_url,
        segments: parsed.segments,
      };
      if (record.passage_vi) content.passageVi = record.passage_vi;
      return { content };
    },
  };
}

function buildDropdownBlanksSchema(): ImportSchema {
  return {
    questionTypeId: "reading-fill-blanks-dropdown",
    skill: "reading",
    columns: ["passage_with_blanks", "passage_vi"],
    example: [
      "Many companies today are adopting remote work policies. Employees can [work|sleep|travel] from home, which often leads to [increased|decreased|random] productivity.",
      "Nhiều công ty hiện nay đang áp dụng chính sách làm việc từ xa. Nhân viên có thể làm việc tại nhà, điều này thường dẫn đến năng suất tăng lên.",
    ],
    notes:
      'Dùng cú pháp [đáp_án_đúng|lựa_chọn_khác|lựa_chọn_khác] cho mỗi chỗ trống — lựa chọn ĐẦU TIÊN luôn là đáp án đúng, hệ thống sẽ tự xáo trộn thứ tự hiển thị. passage_vi (bản dịch tiếng Việt cả đoạn) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.',
    parseContent(record) {
      const text = record.passage_with_blanks ?? "";
      const parts = text.split(/\[(.+?)\]/g);
      const segments: Record<string, unknown>[] = [];
      let blankCount = 0;
      let error: string | null = null;
      parts.forEach((part, i) => {
        if (i % 2 === 0) {
          if (part) segments.push({ type: "text", value: part });
        } else {
          blankCount++;
          const opts = part
            .split("|")
            .map((s) => s.trim())
            .filter(Boolean);
          if (opts.length < 2) {
            error = `Chỗ trống thứ ${blankCount} cần ít nhất 2 lựa chọn, cách nhau bởi dấu | (vd: [work|sleep|travel])`;
            return;
          }
          segments.push({
            type: "blank",
            id: `b${blankCount}`,
            options: shuffleDistinct(opts),
            correctAnswer: opts[0],
          });
        }
      });
      if (error) return { error };
      if (blankCount === 0) {
        return {
          error: "Không tìm thấy chỗ trống nào. Dùng cú pháp [đáp_án|lựa_chọn_khác] để đánh dấu.",
        };
      }
      const content: Record<string, unknown> = { segments };
      if (record.passage_vi) content.passageVi = record.passage_vi;
      return { content };
    },
  };
}

function buildWriteFromDictationSchema(): ImportSchema {
  return {
    questionTypeId: "write-from-dictation",
    skill: "listening",
    codePrefix: "WFD",
    columns: ["sentence", "sentence_vi"],
    example: [
      "The research team published their findings in a leading scientific journal.",
      "Nhóm nghiên cứu đã công bố phát hiện của họ trên một tạp chí khoa học uy tín.",
    ],
    notes:
      "Không cần audio_url — hệ thống tự đọc câu tiếng Anh bằng giọng đọc máy (text-to-speech) khi học viên bấm nghe. sentence_vi (bản dịch tiếng Việt) chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      if (!record.sentence) return { error: "Thiếu sentence" };
      const content: Record<string, unknown> = { sentence: record.sentence };
      if (record.sentence_vi) content.sentenceVi = record.sentence_vi;
      return { content };
    },
  };
}

function buildReorderParagraphsSchema(): ImportSchema {
  return {
    questionTypeId: "reorder-paragraphs",
    skill: "reading",
    columns: Array.from({ length: MAX_PARAGRAPHS }, (_, i) => `paragraph_${i + 1}`),
    example: [
      "Bread has been a staple food for thousands of years, dating back to ancient civilizations.",
      "The process begins with mixing flour, water, yeast, and salt to form a dough.",
      "The dough is then left to rise, allowing the yeast to produce carbon dioxide bubbles.",
      "Finally, the risen dough is baked in an oven until it develops a golden crust.",
      "",
      "",
    ],
    notes:
      "Nhập các đoạn văn theo ĐÚNG thứ tự đọc (paragraph_1 là đoạn đầu tiên). Hệ thống sẽ tự xáo trộn thứ tự hiển thị cho học viên.",
    parseContent(record) {
      const texts: string[] = [];
      for (let i = 1; i <= MAX_PARAGRAPHS; i++) {
        const v = record[`paragraph_${i}`];
        if (v) texts.push(v);
      }
      if (texts.length < 2) {
        return { error: "Cần ít nhất 2 đoạn văn (paragraph_1, paragraph_2, ...)" };
      }
      const ids = texts.map((_, i) => `p${i + 1}`);
      const idToText = new Map(ids.map((id, i) => [id, texts[i]]));
      const shuffledIds = shuffleDistinct(ids);
      const paragraphs = shuffledIds.map((id) => ({ id, text: idToText.get(id)! }));
      return { content: { paragraphs, correctOrder: ids } };
    },
  };
}

function buildHighlightIncorrectWordsSchema(): ImportSchema {
  return {
    questionTypeId: "highlight-incorrect-words",
    skill: "listening",
    columns: ["audio_url", "transcript_with_errors", "transcript_vi"],
    example: [
      "https://example.com/audio/hiw-016.mp3",
      "The train departed from platform three at exactly ten **fifteen** in the evening.",
      "Tàu khởi hành từ sân ga số ba vào đúng mười giờ mười lăm phút tối.",
    ],
    notes:
      "Đánh dấu những từ KHÁC với audio thật bằng **từ** (2 dấu sao 2 bên). Các từ còn lại giữ nguyên, không markup. transcript_vi (bản dịch tiếng Việt bản đúng) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      if (!record.audio_url) return { error: "Thiếu audio_url" };
      const text = record.transcript_with_errors ?? "";
      const tokens = text.split(/\s+/).filter(Boolean);
      const words: string[] = [];
      const incorrectIndexes: number[] = [];
      tokens.forEach((tok, i) => {
        const m = tok.match(/^\*\*(.+)\*\*$/);
        if (m) {
          words.push(m[1]);
          incorrectIndexes.push(i);
        } else {
          words.push(tok);
        }
      });
      if (incorrectIndexes.length === 0) {
        return { error: "Cần đánh dấu ít nhất 1 từ sai bằng **từ**" };
      }
      const content: Record<string, unknown> = { audioUrl: record.audio_url, words, incorrectIndexes };
      if (record.transcript_vi) content.transcriptVi = record.transcript_vi;
      return { content };
    },
  };
}

function buildPassageOnlySchema(
  questionTypeId: string,
  skill: Skill,
  example: string,
  exampleVi?: string
): ImportSchema {
  return {
    questionTypeId,
    skill,
    columns: ["passage", "passage_vi"],
    example: [example, exampleVi ?? ""],
    notes:
      "passage_vi (bản dịch tiếng Việt cả đoạn) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      if (!record.passage) return { error: "Thiếu passage" };
      const content: Record<string, unknown> = { passage: record.passage };
      if (record.passage_vi) content.passageVi = record.passage_vi;
      return { content };
    },
  };
}

function buildImageOnlySchema(): ImportSchema {
  return {
    questionTypeId: "describe-image",
    skill: "speaking",
    columns: ["image_url"],
    example: ["https://example.com/images/describe-image-bar-chart.png"],
    notes: "image_url là link ảnh công khai (Google Drive/CDN...), phải xem trực tiếp được.",
    parseContent(record) {
      if (!record.image_url) return { error: "Thiếu image_url" };
      return { content: { imageUrl: record.image_url } };
    },
  };
}

function buildSituationOnlySchema(): ImportSchema {
  return {
    questionTypeId: "respond-to-situation",
    skill: "speaking",
    columns: ["situation_text", "situation_text_vi"],
    example: [
      "You have just moved to a new neighborhood. Leave a message introducing yourself to a neighbor and ask about useful places nearby.",
      "Bạn vừa chuyển đến một khu phố mới. Hãy để lại lời nhắn tự giới thiệu bản thân với hàng xóm và hỏi về các địa điểm hữu ích gần đó.",
    ],
    notes:
      "situation_text_vi (bản dịch tiếng Việt) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      if (!record.situation_text) return { error: "Thiếu situation_text" };
      const content: Record<string, unknown> = { situationText: record.situation_text };
      if (record.situation_text_vi) content.situationTextVi = record.situation_text_vi;
      return { content };
    },
  };
}

function buildEssaySchema(): ImportSchema {
  return {
    questionTypeId: "write-essay",
    skill: "writing",
    columns: ["prompt", "prompt_vi", "min_words", "max_words", "time_limit_minutes"],
    example: [
      "Some people believe that technology has made our lives more complicated, while others think it has simplified daily life. Discuss both views and give your own opinion.",
      "Một số người cho rằng công nghệ khiến cuộc sống phức tạp hơn, trong khi số khác nghĩ rằng nó giúp cuộc sống hàng ngày đơn giản hơn. Hãy bàn luận cả hai quan điểm và nêu ý kiến của bạn.",
      "200",
      "300",
      "20",
    ],
    notes:
      "Để trống min_words/max_words/time_limit_minutes sẽ dùng mặc định 200/300/20. prompt_vi (bản dịch tiếng Việt) không bắt buộc, chỉ để tham khảo nội bộ, không hiển thị cho học viên.",
    parseContent(record) {
      if (!record.prompt) return { error: "Thiếu prompt" };
      const minWords = record.min_words ? Number(record.min_words) : 200;
      const maxWords = record.max_words ? Number(record.max_words) : 300;
      const timeLimitMinutes = record.time_limit_minutes ? Number(record.time_limit_minutes) : 20;
      if (![minWords, maxWords, timeLimitMinutes].every((n) => Number.isInteger(n) && n > 0)) {
        return { error: "min_words/max_words/time_limit_minutes phải là số nguyên dương" };
      }
      if (minWords >= maxWords) {
        return { error: "min_words phải nhỏ hơn max_words" };
      }
      const content: Record<string, unknown> = { prompt: record.prompt, minWords, maxWords, timeLimitMinutes };
      if (record.prompt_vi) content.promptVi = record.prompt_vi;
      return { content };
    },
  };
}

export const QUESTION_IMPORT_SCHEMAS: Record<string, ImportSchema> = {
  "read-aloud": buildPassageOnlySchema(
    "read-aloud",
    "speaking",
    "Climate change is one of the most pressing challenges facing humanity today. Rising temperatures have led to more frequent extreme weather events.",
    "Biến đổi khí hậu là một trong những thách thức cấp bách nhất mà nhân loại đang đối mặt. Nhiệt độ tăng đã dẫn đến các hiện tượng thời tiết cực đoan xảy ra thường xuyên hơn."
  ),
  "write-essay": buildEssaySchema(),
  "reading-mcq-single": buildMcqSingleSchema("reading-mcq-single", "reading", "passage"),
  "listening-fill-blanks": buildListeningFillBlanksSchema(),
  "write-from-dictation": buildWriteFromDictationSchema(),
  "repeat-sentence": buildAudioTextSchema(
    "repeat-sentence",
    "speaking",
    "referenceText",
    "reference_text",
    ["", "The library will be closed for renovations next month."],
    "Thư viện sẽ đóng cửa để cải tạo vào tháng tới.",
    false
  ),
  "describe-image": buildImageOnlySchema(),
  "retell-lecture": buildAudioTextSchema(
    "retell-lecture",
    "speaking",
    "transcript",
    "transcript",
    [
      "https://example.com/audio/rl-004.mp3",
      "Today we will discuss the water cycle, which describes how water moves through the atmosphere, the land, and the oceans.",
    ],
    "Hôm nay chúng ta sẽ thảo luận về vòng tuần hoàn nước, mô tả cách nước di chuyển qua khí quyển, đất liền và đại dương."
  ),
  "answer-short-question": buildAudioTextSchema(
    "answer-short-question",
    "speaking",
    "referenceAnswer",
    "reference_answer",
    ["https://example.com/audio/asq-018.mp3", "astronomer"],
    "nhà thiên văn học"
  ),
  "summarize-group-discussion": buildAudioTextSchema(
    "summarize-group-discussion",
    "speaking",
    "transcript",
    "transcript",
    [
      "https://example.com/audio/sgd-003.mp3",
      "Let's talk about remote work policies. Some employees prefer working from home...",
    ],
    "Hãy cùng bàn về chính sách làm việc từ xa. Một số nhân viên thích làm việc tại nhà..."
  ),
  "respond-to-situation": buildSituationOnlySchema(),
  "summarize-written-text": buildPassageOnlySchema(
    "summarize-written-text",
    "writing",
    "Urban green spaces, such as parks, gardens, and tree-lined streets, play a vital role in improving the quality of life in cities.",
    "Không gian xanh đô thị như công viên, vườn hoa và đường cây xanh đóng vai trò quan trọng trong việc nâng cao chất lượng cuộc sống ở các thành phố."
  ),
  "reading-mcq-multiple": buildMcqMultiSchema("reading-mcq-multiple", "reading", "passage"),
  "reorder-paragraphs": buildReorderParagraphsSchema(),
  "reading-fill-blanks-dropdown": buildDropdownBlanksSchema(),
  "reading-fill-blanks-drag-drop": buildBlanksDragDropSchema(),
  "summarize-spoken-text": buildAudioTextSchema(
    "summarize-spoken-text",
    "listening",
    "transcript",
    "transcript",
    [
      "https://example.com/audio/sst-001.mp3",
      "Renewable energy sources such as solar, wind, and hydroelectric power are becoming increasingly important.",
    ],
    "Các nguồn năng lượng tái tạo như năng lượng mặt trời, gió và thủy điện đang ngày càng trở nên quan trọng."
  ),
  "listening-mcq-multiple": buildMcqMultiSchema("listening-mcq-multiple", "listening", "audio_url"),
  "highlight-correct-summary": buildMcqSingleSchema(
    "highlight-correct-summary",
    "listening",
    "audio_url"
  ),
  "listening-mcq-single": buildMcqSingleSchema("listening-mcq-single", "listening", "audio_url"),
  "select-missing-word": buildMcqSingleSchema("select-missing-word", "listening", "audio_url"),
  "highlight-incorrect-words": buildHighlightIncorrectWordsSchema(),
};
