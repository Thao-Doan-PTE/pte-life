import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { scoreColorClass } from "@/lib/format";
import { getSessionQuestionResults } from "@/lib/mocktest-queries";
import { mockTestSessionLabel } from "@/lib/mocktest-label";

export default async function MockTestResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const mockSession = await prisma.mockTestSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!mockSession) notFound();

  const results = await getSessionQuestionResults(
    userId,
    mockSession.questionIds,
    mockSession.startedAt
  );

  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10 sm:px-10">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-medium text-primary">
            {mockTestSessionLabel(mockSession)}
          </p>
          <h1 className="text-2xl font-semibold">Kết quả Mocktest</h1>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-6">
            <span
              className={cn(
                "text-4xl font-bold",
                scoreColorClass(mockSession.scorePct ?? 0)
              )}
            >
              {mockSession.scorePct ?? "-"}%
            </span>
            <span className="text-sm text-muted-foreground">điểm trung bình</span>
          </CardContent>
        </Card>

        <div className="flex flex-col divide-y rounded-xl border bg-card">
          {results.map((r, i) => (
            <Link
              key={r.questionId}
              href={`/practice/${mockSession.skill ?? ""}/${r.questionTypeId}/${r.questionId}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{i + 1}.</span>
                <Badge variant="secondary" className="shrink-0">
                  {r.code}
                </Badge>
                <span>{r.typeName}</span>
              </div>
              <span
                className={cn(
                  "font-semibold",
                  r.scorePct !== null ? scoreColorClass(r.scorePct) : "text-muted-foreground"
                )}
              >
                {r.scorePct !== null ? `${r.scorePct}%` : "Chưa làm"}
              </span>
            </Link>
          ))}
        </div>

        <Button
          className="self-center bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
          nativeButton={false}
          render={<Link href="/mocktest" />}
        >
          Về trang Mocktest
        </Button>
      </div>
    </AppShell>
  );
}
