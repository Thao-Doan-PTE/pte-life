export interface PracticeInstructions {
  description: string;
  prepSeconds?: number;
  recordSeconds?: number;
  timeLimitSeconds?: number;
  minWords?: number;
  maxWords?: number;
}

/** 4 dạng dùng chung components/practice/players/speaking-audio-task-player.tsx
 * (nghe audio rồi ghi âm trả lời) — dùng để bật giao diện redesign (header mới,
 * nghe lại câu, khung ghi âm luôn hiện, thanh điều hướng có nút Thử lại) chỉ cho
 * đúng 4 dạng này, không lan ra 17 dạng khác. */
export const AUDIO_TASK_TYPE_IDS = new Set([
  "repeat-sentence",
  "retell-lecture",
  "answer-short-question",
  "summarize-group-discussion",
]);

/**
 * Hướng dẫn thời gian/luật làm bài theo từng dạng câu hỏi. Số giây/số từ ở đây là
 * ƯỚC LƯỢNG theo cấu trúc bài thi PTE công khai — cần đội nội dung PTE-Life xác nhận
 * lại số liệu chính xác trước khi hiển thị công khai cho học viên (giống lưu ý ở
 * lib/question-types.ts về trọng số).
 */
export const PRACTICE_INSTRUCTIONS: Record<string, PracticeInstructions> = {
  // Speaking
  "read-aloud": {
    description: "35 giây chuẩn bị, 40 giây để đọc to đoạn văn.",
    prepSeconds: 35,
    recordSeconds: 40,
  },
  "repeat-sentence": {
    description: "Bạn sẽ nghe một câu. Hãy lặp lại chính xác câu đó. Câu chỉ phát một lần duy nhất!",
    prepSeconds: 3,
    recordSeconds: 15,
  },
  "describe-image": {
    description: "25 giây chuẩn bị, 40 giây để mô tả hình ảnh.",
    prepSeconds: 25,
    recordSeconds: 40,
  },
  "retell-lecture": {
    description: "10 giây chuẩn bị, 40 giây để tóm tắt lại bài giảng vừa nghe.",
    prepSeconds: 10,
    recordSeconds: 40,
  },
  "answer-short-question": {
    description: "Nghe câu hỏi ngắn, trả lời trong tối đa 10 giây.",
    prepSeconds: 3,
    recordSeconds: 10,
  },
  "summarize-group-discussion": {
    description: "Nghe đoạn thảo luận nhóm, tóm tắt lại trong tối đa 90 giây.",
    prepSeconds: 10,
    recordSeconds: 90,
  },
  "respond-to-situation": {
    description: "20 giây chuẩn bị, 40 giây để phản hồi tình huống.",
    prepSeconds: 20,
    recordSeconds: 40,
  },

  // Writing
  "write-essay": {
    description: "20 phút để viết bài luận 200–300 từ.",
    timeLimitSeconds: 20 * 60,
    minWords: 200,
    maxWords: 300,
  },
  "summarize-written-text": {
    description: "10 phút để tóm tắt đoạn văn thành 1 câu (5–75 từ).",
    timeLimitSeconds: 10 * 60,
    minWords: 5,
    maxWords: 75,
  },

  // Reading
  "reading-mcq-single": {
    description: "Đọc đoạn văn và chọn 1 đáp án đúng nhất. Không giới hạn thời gian riêng.",
  },
  "reading-mcq-multiple": {
    description: "Đọc đoạn văn và chọn tất cả đáp án đúng. Không giới hạn thời gian riêng.",
  },
  "reorder-paragraphs": {
    description: "Sắp xếp lại các đoạn văn theo đúng thứ tự logic.",
  },
  "reading-fill-blanks-dropdown": {
    description: "Chọn từ đúng cho mỗi chỗ trống từ danh sách thả xuống.",
  },
  "reading-fill-blanks-drag-drop": {
    description: "Kéo thả từ trong ngân hàng từ vào đúng chỗ trống.",
  },

  // Listening
  "summarize-spoken-text": {
    description: "Nghe bài giảng, viết tóm tắt 50–70 từ trong 10 phút.",
    timeLimitSeconds: 10 * 60,
    minWords: 50,
    maxWords: 70,
  },
  "listening-mcq-multiple": {
    description: "Nghe audio (1 lần) rồi chọn tất cả đáp án đúng.",
  },
  "listening-fill-blanks": {
    description: "Nghe audio (1 lần) rồi gõ lại từ còn thiếu vào chỗ trống.",
  },
  "highlight-correct-summary": {
    description: "Nghe audio (1 lần) rồi chọn đoạn tóm tắt đúng nhất.",
  },
  "listening-mcq-single": {
    description: "Nghe audio (1 lần) rồi chọn 1 đáp án đúng nhất.",
  },
  "select-missing-word": {
    description: "Nghe audio (1 lần), đoạn kết thúc đột ngột — chọn từ/cụm từ còn thiếu.",
  },
  "highlight-incorrect-words": {
    description: "Nghe audio (1 lần) rồi bấm chọn những từ khác với audio trong bản chép lời.",
  },
  "write-from-dictation": {
    description: "Nghe câu 1 lần rồi gõ lại chính xác những gì bạn nghe được.",
  },
};
