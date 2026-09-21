import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { WfdListenPractice } from "@/components/wfd/wfd-listen-practice";
import { getQuestionsForType } from "@/lib/practice-queries";
import type { Skill } from "@/lib/question-types";

const VALID_SKILLS: Skill[] = ["speaking", "writing", "reading", "listening"];

// Mỗi dạng bài lưu câu cần nghe/lặp lại ở field content khác nhau — bảng tra
// này cho phép "Luyện nghe" hoạt động chung cho nhiều typeId thay vì chỉ WFD.
const CONTENT_FIELD_BY_TYPE: Record<string, { sentence: string; sentenceVi: string }> = {
  "write-from-dictation": { sentence: "sentence", sentenceVi: "sentenceVi" },
  "repeat-sentence": { sentence: "referenceText", sentenceVi: "referenceTextVi" },
};

export default async function WfdListenPracticePage({
  params,
}: {
  params: Promise<{ skill: string; typeId: string }>;
}) {
  const { skill, typeId } = await params;
  const fields = CONTENT_FIELD_BY_TYPE[typeId];

  if (!VALID_SKILLS.includes(skill as Skill) || !fields) {
    notFound();
  }

  const questions = await getQuestionsForType(typeId);

  return (
    <AppShell>
      <WfdShell>
        <WfdListenPractice
          backHref={`/practice/${skill}/${typeId}`}
          questions={questions.map((q) => {
            const content = q.content as Record<string, unknown>;
            return {
              id: q.id,
              sentence: content[fields.sentence] as string,
              sentenceVi: (content[fields.sentenceVi] as string | undefined) ?? null,
            };
          })}
        />
      </WfdShell>
    </AppShell>
  );
}
