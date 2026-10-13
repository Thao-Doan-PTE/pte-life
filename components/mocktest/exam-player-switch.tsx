import { ExamWfdPlayer } from "@/components/mocktest/exam-players/exam-wfd-player";
import { ExamTextAnswerPlayer } from "@/components/mocktest/exam-players/exam-text-answer-player";
import { ExamChoicePlayer } from "@/components/mocktest/exam-players/exam-choice-player";
import { ExamSpeakingAudioPlayer } from "@/components/mocktest/exam-players/exam-speaking-audio-player";
import { ExamSpeakingManualPlayer } from "@/components/mocktest/exam-players/exam-speaking-manual-player";
import { renderPracticePlayer } from "@/components/practice/practice-player-switch";
import type { PracticeInstructions } from "@/lib/practice-config";

export interface ExamPlayerOptions {
  /** Speaking: gửi kèm file ghi âm khi nộp (câu đang là bài nộp chờ giáo viên
   * chấm — trang tính ở server). Mặc định không gửi. */
  collectAudio?: boolean;
  /** Lượt Mock test gắn bài tập đang làm — server kiểm tra lại rồi ưu tiên gắn
   * bài nộp vào bài tập của lượt đó. */
  mockSessionId?: string;
}

/** Router cho khung "giao diện thi thật" (Exam Simulation / Mock Test) —
 * dùng bản exam-player tối giản, đúng chuẩn Pearson cho các dạng đã chuyển
 * đổi; dạng chưa chuyển (tương tác kéo-thả phức tạp: sắp xếp đoạn văn, điền
 * chỗ trống kéo-thả/dropdown, gạch từ sai) tạm dùng lại player luyện tập
 * thường (renderPracticePlayer) — vẫn hoạt động đúng, chỉ chưa khớp 100%
 * giao diện thi thật. */
export function renderExamPlayer(
  typeId: string,
  questionId: string,
  content: Record<string, unknown>,
  instructions: PracticeInstructions,
  options: ExamPlayerOptions = {}
) {
  const { collectAudio = false, mockSessionId } = options;
  switch (typeId) {
    case "write-from-dictation":
      if (typeof content.sentence === "string")
        return <ExamWfdPlayer sentence={content.sentence} />;
      break;

    // Speaking — nghe rồi nói
    case "repeat-sentence":
      if (typeof content.audioUrl === "string" || typeof content.referenceText === "string")
        return (
          <ExamSpeakingAudioPlayer
            questionId={questionId}
            instructionText={instructions.description}
            audioUrl={typeof content.audioUrl === "string" ? content.audioUrl : undefined}
            ttsText={typeof content.referenceText === "string" ? content.referenceText : undefined}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
            collectAudio={collectAudio}
            mockSessionId={mockSessionId}
          />
        );
      break;
    case "retell-lecture":
    case "answer-short-question":
    case "summarize-group-discussion":
      if (typeof content.audioUrl === "string")
        return (
          <ExamSpeakingAudioPlayer
            questionId={questionId}
            instructionText={instructions.description}
            audioUrl={content.audioUrl}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
            collectAudio={collectAudio}
            mockSessionId={mockSessionId}
          />
        );
      break;

    // Speaking — đọc/nhìn/tình huống rồi nói
    case "read-aloud":
      if (typeof content.passage === "string")
        return (
          <ExamSpeakingManualPlayer
            questionId={questionId}
            instructionText={instructions.description}
            passageText={content.passage}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
            collectAudio={collectAudio}
            mockSessionId={mockSessionId}
          />
        );
      break;
    case "describe-image":
      if (typeof content.imageUrl === "string")
        return (
          <ExamSpeakingManualPlayer
            questionId={questionId}
            instructionText={instructions.description}
            imageUrl={content.imageUrl}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
            collectAudio={collectAudio}
            mockSessionId={mockSessionId}
          />
        );
      break;
    case "respond-to-situation":
      if (typeof content.situationText === "string")
        return (
          <ExamSpeakingManualPlayer
            questionId={questionId}
            instructionText={instructions.description}
            situationText={content.situationText}
            prepSeconds={instructions.prepSeconds!}
            recordSeconds={instructions.recordSeconds!}
            collectAudio={collectAudio}
            mockSessionId={mockSessionId}
          />
        );
      break;

    // Writing / gõ chữ tự do
    case "write-essay":
      if (typeof content.prompt === "string")
        return (
          <ExamTextAnswerPlayer
            questionId={questionId}
            mockSessionId={mockSessionId}
            instructionText={instructions.description}
            passageText={content.prompt}
          />
        );
      break;
    case "summarize-written-text":
      if (typeof content.passage === "string")
        return (
          <ExamTextAnswerPlayer
            questionId={questionId}
            mockSessionId={mockSessionId}
            instructionText={instructions.description}
            passageText={content.passage}
          />
        );
      break;
    case "summarize-spoken-text":
      if (typeof content.audioUrl === "string")
        return (
          <ExamTextAnswerPlayer
            questionId={questionId}
            mockSessionId={mockSessionId}
            instructionText={instructions.description}
            audioUrl={content.audioUrl}
          />
        );
      break;

    // Chọn đáp án sau khi đọc/nghe
    case "reading-mcq-single":
      if (
        typeof content.passage === "string" &&
        typeof content.question === "string" &&
        Array.isArray(content.options)
      )
        return (
          <ExamChoicePlayer
            instructionText={instructions.description}
            passageText={content.passage}
            question={content.question}
            options={content.options as string[]}
          />
        );
      break;
    case "reading-mcq-multiple":
      if (
        typeof content.passage === "string" &&
        typeof content.question === "string" &&
        Array.isArray(content.options)
      )
        return (
          <ExamChoicePlayer
            instructionText={instructions.description}
            passageText={content.passage}
            question={content.question}
            options={content.options as string[]}
            maxSelectable={(content.maxSelectable as number) ?? 2}
          />
        );
      break;
    case "listening-mcq-single":
    case "select-missing-word":
    case "highlight-correct-summary":
      if (
        typeof content.audioUrl === "string" &&
        typeof content.question === "string" &&
        Array.isArray(content.options)
      )
        return (
          <ExamChoicePlayer
            instructionText={instructions.description}
            audioUrl={content.audioUrl}
            question={content.question}
            options={content.options as string[]}
          />
        );
      break;
    case "listening-mcq-multiple":
      if (
        typeof content.audioUrl === "string" &&
        typeof content.question === "string" &&
        Array.isArray(content.options)
      )
        return (
          <ExamChoicePlayer
            instructionText={instructions.description}
            audioUrl={content.audioUrl}
            question={content.question}
            options={content.options as string[]}
            maxSelectable={(content.maxSelectable as number) ?? 2}
          />
        );
      break;
  }

  // Dạng tương tác phức tạp chưa có bản exam riêng (kéo-thả/dropdown/gạch từ) —
  // dùng tạm player luyện tập thường, vẫn chấm điểm đúng, chỉ chưa khớp 100%
  // giao diện thi thật.
  return renderPracticePlayer(typeId, questionId, content, instructions, { collectAudio });
}
