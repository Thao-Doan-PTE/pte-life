import Anthropic from "@anthropic-ai/sdk";
import { CRITERIA_BY_TASK, buildGradingPrompt } from "@/lib/scoring/ai/rubric";
import type {
  WritingGradeInput,
  WritingGradeResult,
  WritingGrader,
} from "@/lib/scoring/ai/types";

const MODEL = "claude-sonnet-5";

function buildToolSchema(criteria: string[]) {
  const criterionSchema = {
    type: "object" as const,
    properties: {
      scorePct: { type: "integer", minimum: 0, maximum: 100 },
      feedback: { type: "string" },
    },
    required: ["scorePct", "feedback"],
  };

  return {
    name: "submit_writing_grade",
    description: "Nộp kết quả chấm điểm bài viết theo rubric PTE.",
    input_schema: {
      type: "object" as const,
      properties: {
        criteria: {
          type: "object",
          properties: Object.fromEntries(
            criteria.map((c) => [c, criterionSchema])
          ),
          required: criteria,
        },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              quote: { type: "string" },
              type: {
                type: "string",
                enum: ["grammar", "vocabulary", "spelling", "content", "form"],
              },
              suggestion: { type: "string" },
              explanation: { type: "string" },
            },
            required: ["quote", "type", "suggestion", "explanation"],
          },
        },
        generalFeedback: { type: "string" },
      },
      required: ["criteria", "issues", "generalFeedback"],
    },
  };
}

export class AnthropicWritingGrader implements WritingGrader {
  private client: Anthropic;

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (!apiKey) {
      throw new Error("Thiếu ANTHROPIC_API_KEY trong biến môi trường.");
    }
    this.client = new Anthropic({ apiKey });
  }

  async grade(input: WritingGradeInput): Promise<WritingGradeResult> {
    const criteria = CRITERIA_BY_TASK[input.taskType];
    const tool = buildToolSchema(criteria);
    const prompt = buildGradingPrompt(
      input.taskType,
      input.sourceText,
      input.studentText
    );

    const message = await this.client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      tools: [tool],
      tool_choice: { type: "tool", name: "submit_writing_grade" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolUse = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error("AI không trả về kết quả chấm điểm hợp lệ.");
    }

    return toolUse.input as WritingGradeResult;
  }
}
