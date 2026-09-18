import { AnthropicSpeakingGrader } from "@/lib/scoring/ai/anthropic-speaking-grader";
import type { SpeakingGrader } from "@/lib/scoring/ai/speaking-types";

export type {
  SpeakingGradeInput,
  SpeakingGradeResult,
  SpeakingGrader,
  SpeakingTaskType,
  SpeakingCriterionScore,
} from "@/lib/scoring/ai/speaking-types";

export function getSpeakingGrader(): SpeakingGrader {
  return new AnthropicSpeakingGrader();
}
