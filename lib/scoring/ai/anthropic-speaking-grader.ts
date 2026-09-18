import Anthropic from "@anthropic-ai/sdk";
import type {
  SpeakingGradeInput,
  SpeakingGradeResult,
  SpeakingGrader,
} from "@/lib/scoring/ai/speaking-types";

const MODEL = "claude-sonnet-5";

const TASK_LABELS: Record<string, string> = {
  "read-aloud": "Read Aloud — học viên đọc to lại đúng đoạn văn gốc.",
  "repeat-sentence": "Repeat Sentence — học viên nhắc lại chính xác câu vừa nghe.",
  "describe-image": "Describe Image — học viên mô tả nội dung một hình ảnh (biểu đồ/ảnh).",
  "retell-lecture": "Retell Lecture — học viên tóm tắt lại bài giảng vừa nghe.",
  "answer-short-question": "Answer Short Question — học viên trả lời ngắn gọn 1 câu hỏi.",
  "summarize-group-discussion": "Summarize Group Discussion — học viên tóm tắt đoạn thảo luận vừa nghe.",
  "respond-to-situation": "Respond to Situation — học viên phản hồi phù hợp với 1 tình huống cho trước.",
};

const CRITERION_SCHEMA = {
  type: "object" as const,
  properties: {
    scorePct: { type: "integer", minimum: 0, maximum: 100 },
    feedback: { type: "string" },
  },
  required: ["scorePct", "feedback"],
};

const TOOL = {
  name: "submit_speaking_grade",
  description: "Nộp kết quả chấm điểm Speaking theo rubric PTE.",
  input_schema: {
    type: "object" as const,
    properties: {
      criteria: {
        type: "object",
        properties: {
          content: CRITERION_SCHEMA,
          pronunciation: CRITERION_SCHEMA,
          fluency: CRITERION_SCHEMA,
          vocabulary: CRITERION_SCHEMA,
        },
        required: ["content", "pronunciation", "fluency", "vocabulary"],
      },
      generalFeedback: { type: "string" },
    },
    required: ["criteria", "generalFeedback"],
  },
};

function buildPrompt(input: SpeakingGradeInput): string {
  return `Đây là bài luyện Speaking PTE Academic/Core, dạng: ${TASK_LABELS[input.taskType]}

**LƯU Ý QUAN TRỌNG (giới hạn phiên bản hiện tại — V1)**: Bạn KHÔNG được nghe file audio gốc của học viên. Bạn chỉ nhận được:
1. Bản chuyển văn bản tự động (transcript) từ giọng nói qua Web Speech API của trình duyệt — có thể có lỗi nhận dạng.
2. Vài chỉ số đo được: tốc độ nói và số từ đệm (không đo được ngữ điệu/phát âm thật).

Vì vậy khi chấm:
- "content": đánh giá dựa trên transcript so với văn bản/nhiệm vụ tham chiếu bên dưới.
- "vocabulary": đánh giá từ vựng dùng trong transcript.
- "fluency": dựa vào tốc độ nói đo được là ${input.wordsPerMinute} từ/phút (chuẩn PTE tự nhiên là 120–160 từ/phút) và ${input.fillerWordCount} từ đệm (um, uh...) phát hiện được trong transcript — không dựa vào audio thật.
- "pronunciation": BẮT BUỘC trả về scorePct = 50 và feedback CHÍNH XÁC là: "Phiên bản hiện tại chưa tích hợp công cụ phân tích phát âm chuyên dụng (ví dụ Azure Pronunciation Assessment) vì chưa nghe được audio thật. Điểm này chỉ là placeholder, sẽ được thay thế ở bản nâng cấp V2." — không tự suy đoán điểm phát âm từ transcript.

${input.referenceText ? `Văn bản/nhiệm vụ tham chiếu:\n"""\n${input.referenceText}\n"""\n` : ""}
Bản ghi (transcript) giọng nói của học viên:
"""
${input.transcript || "(không nhận dạng được giọng nói nào — có thể học viên không nói gì hoặc trình duyệt không nhận diện được)"}
"""

Thời lượng ghi âm: ${input.durationSeconds} giây.

Hãy chấm khách quan. scorePct 0-100 cho mỗi tiêu chí (trừ pronunciation luôn là 50 như hướng dẫn). feedback tiếng Việt ngắn gọn 1-2 câu. generalFeedback 2-3 câu tổng kết, giọng điệu khích lệ, có gợi ý cải thiện cụ thể (trừ phần phát âm vì chưa đánh giá được).`;
}

export class AnthropicSpeakingGrader implements SpeakingGrader {
  private client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new Error("Thiếu ANTHROPIC_API_KEY trong biến môi trường.");
    }
    this.client = new Anthropic({ apiKey });
  }

  async grade(input: SpeakingGradeInput): Promise<SpeakingGradeResult> {
    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    if (input.imageBase64 && input.imageMediaType) {
      contentBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: input.imageMediaType as
            | "image/png"
            | "image/jpeg"
            | "image/webp",
          data: input.imageBase64,
        },
      });
    }

    contentBlocks.push({ type: "text", text: buildPrompt(input) });

    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "submit_speaking_grade" },
      messages: [{ role: "user", content: contentBlocks }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error("AI không trả về kết quả chấm điểm hợp lệ.");
    }

    return toolUse.input as SpeakingGradeResult;
  }
}
