import { toCsv } from "@/lib/question-import/csv";
import type { ImportSchema } from "@/lib/question-import/schemas";
import { QUESTION_TYPES } from "@/lib/question-types";

export function buildTemplateCsv(schema: ImportSchema): string {
  const header = ["code", "available_in", ...schema.columns];
  const questionType = QUESTION_TYPES.find((t) => t.id === schema.questionTypeId);
  const prefix =
    questionType?.code ?? schema.codePrefix ?? schema.questionTypeId.toUpperCase().slice(0, 4);
  const example = [`${prefix}-001`, "academic,core", ...schema.example];
  return toCsv([header, example]);
}
