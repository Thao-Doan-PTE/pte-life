import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { QuestionImportForm } from "@/components/admin/question-import-form";
import { QuestionBulkList } from "@/components/admin/question-bulk-list";
import { getQuestionCounts, getQuestionsForTypeAdmin } from "@/lib/actions/admin-questions";
import { QUESTION_IMPORT_SCHEMAS } from "@/lib/question-import/schemas";
import { SKILL_LABELS, type Skill } from "@/lib/question-types";

const SKILL_ORDER: Skill[] = ["speaking", "writing", "reading", "listening"];

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  const counts = await getQuestionCounts();
  const { type } = await searchParams;
  const selectedType = type && QUESTION_IMPORT_SCHEMAS[type] ? type : counts[0]?.questionTypeId;
  const schema = selectedType ? QUESTION_IMPORT_SCHEMAS[selectedType] : null;
  const questions = selectedType ? await getQuestionsForTypeAdmin(selectedType) : [];

  return (
    <AppShell>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:px-10 md:flex-row">
        <aside className="flex shrink-0 flex-col gap-4 md:w-64">
          <div>
            <h1 className="text-lg font-semibold">Ngân hàng đề</h1>
            <p className="text-sm text-muted-foreground">
              Chọn 1 dạng câu hỏi để import hoặc quản lý.
            </p>
          </div>
          {SKILL_ORDER.map((skill) => (
            <div key={skill} className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {SKILL_LABELS[skill]}
              </p>
              {counts
                .filter((c) => c.skill === skill)
                .map((c) => (
                  <Link
                    key={c.questionTypeId}
                    href={`/admin/questions?type=${c.questionTypeId}`}
                    className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted ${
                      c.questionTypeId === selectedType ? "bg-muted font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <span>{c.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {c.count}
                    </Badge>
                  </Link>
                ))}
            </div>
          ))}
        </aside>

        {schema && selectedType ? (
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {counts.find((c) => c.questionTypeId === selectedType)?.name}
              </h2>
              <a
                href={`/api/admin/questions/template?type=${selectedType}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Tải file mẫu (.csv)
              </a>
            </div>

            {schema.notes && (
              <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                {schema.notes}
              </p>
            )}

            <QuestionImportForm questionTypeId={selectedType} />

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{questions.length} câu trong ngân hàng đề</p>
              <QuestionBulkList
                questions={questions.map((q) => ({
                  id: q.id,
                  code: q.code,
                  availableIn: q.availableIn,
                  createdAt: q.createdAt.toISOString(),
                }))}
                questionTypeId={selectedType}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có dạng câu hỏi nào.</p>
        )}
      </div>
    </AppShell>
  );
}
