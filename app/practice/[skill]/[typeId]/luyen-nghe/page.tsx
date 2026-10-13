import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WfdShell } from "@/components/wfd/wfd-shell";
import { WfdListenPractice } from "@/components/wfd/wfd-listen-practice";
import { getQuestionsForType } from "@/lib/practice-queries";
import { QUESTION_TYPES, type Skill } from "@/lib/question-types";
import { requireClassStudent } from "@/lib/require-class-student";

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
  // Chặn ở từng trang (không chỉ ở layout): khi chuyển trang phía trình duyệt,
  // Next.js có thể bỏ qua layout đã có sẵn.
  const { skill, typeId } = await params;
  const access = await requireClassStudent({ allowTuTrial: (typeId === "write-from-dictation" || typeId === "repeat-sentence") });
  const fields = CONTENT_FIELD_BY_TYPE[typeId];

  if (!VALID_SKILLS.includes(skill as Skill) || !fields) {
    notFound();
  }

  // Người dùng thử chỉ luyện nghe câu thuộc bộ đề Tủ.
  const questions = await getQuestionsForType(typeId, access === "tu-trial" ? "TU" : undefined);
  const questionType = QUESTION_TYPES.find((t) => t.id === typeId);
  const typeName = questionType?.name ?? typeId;
  const typeCode = questionType?.code ?? "";

  return (
    <AppShell>
      <WfdShell>
        <WfdListenPractice
          backHref={`/practice/${skill}/${typeId}`}
          typeName={typeName}
          typeCode={typeCode}
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
