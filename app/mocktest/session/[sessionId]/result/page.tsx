import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { requireClassStudent } from "@/lib/require-class-student";
import { QUESTION_TYPES } from "@/lib/question-types";

export default async function MockTestResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  // Chặn ở từng trang (không chỉ ở layout): khi chuyển trang phía trình duyệt,
  // Next.js có thể bỏ qua layout đã có sẵn.
  const access = await requireClassStudent({ allowTuTrial: true });
  const { sessionId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const mockSession = await prisma.mockTestSession.findFirst({
    where: { id: sessionId, userId },
  });
  if (!mockSession) notFound();
  // Người dùng thử Tủ chỉ có lượt thi thử Đề Tủ.
  if (access === "tu-trial" && mockSession.mode !== "tu") redirect("/de-tu");

  const results = await getSessionQuestionResults(
    userId,
    mockSession.questionIds,
    mockSession.startedAt
  );

  return (
    <AppShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-10 sm:px-10">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-[15px] font-medium text-primary">
            {mockTestSessionLabel(mockSession)}
          </p>
          <h1 className="text-2xl font-semibold">Kết quả Mocktest</h1>
        </div>

        {mockSession.mode === "full" && mockSession.overallScore !== null ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">{mockSession.overallScore}</span>
                <span className="text-[20px] text-muted-foreground">/ 90 GSE</span>
              </div>
              <p className="text-[13px] text-muted-foreground">
                Điểm tổng theo chuẩn Pearson (GSE 10–90) — có trọng số theo từng dạng câu hỏi, không phải trung
                bình cộng.
              </p>
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["Listening", mockSession.listeningScore],
                    ["Reading", mockSession.readingScore],
                    ["Speaking", mockSession.speakingScore],
                    ["Writing", mockSession.writingScore],
                  ] as const
                ).map(([label, score]) => (
                  <div key={label} className="flex flex-col items-center gap-1 rounded-lg border bg-muted/40 py-3">
                    <span className="text-2xl font-bold">{score ?? "-"}</span>
                    <span className="text-[13px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
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
              <span className="text-[15px] text-muted-foreground">điểm trung bình</span>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col divide-y rounded-xl border bg-card">
          {results.map((r, i) => (
            <Link
              key={r.questionId}
              href={`/practice/${QUESTION_TYPES.find((t) => t.id === r.questionTypeId)?.skill ?? mockSession.skill ?? ""}/${r.questionTypeId}/${r.questionId}${mockSession.mode === "tu" ? "?bank=TU" : ""}`}
              className="flex items-center justify-between gap-3 px-4 py-3 text-[15px] transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-muted-foreground">{i + 1}.</span>
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
          render={<Link href={mockSession.mode === "tu" ? "/de-tu" : "/mocktest"} />}
        >
          {mockSession.mode === "tu" ? "Về Luyện đề Tủ" : "Về trang Mocktest"}
        </Button>
      </div>
    </AppShell>
  );
}
