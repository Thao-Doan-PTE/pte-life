import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { HistoryList } from "@/components/history/history-list";
import { getPracticeHistory } from "@/lib/history-queries";

export default async function HistoryPage() {
  const session = await auth();
  const userId = session!.user.id;

  const history = await getPracticeHistory(userId);

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-5 py-6 sm:px-10">
        <h1 className="text-xl font-semibold">Lịch sử luyện tập</h1>
        <HistoryList
          items={history.map((h) => ({
            id: h.id,
            skill: h.skill,
            typeName: h.typeName,
            questionCode: h.questionCode,
            excerpt: h.excerpt,
            scorePct: h.scorePct,
            pteScore: h.pteScore,
            createdAt: h.createdAt.toISOString(),
          }))}
        />
      </div>
    </AppShell>
  );
}
