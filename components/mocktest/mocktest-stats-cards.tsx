import { CheckCircle2, ListChecks, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function MocktestStatsCards({
  totalCompleted,
  averageScorePct,
}: {
  totalCompleted: number;
  averageScorePct: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ListChecks className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{totalCompleted}</p>
            <p className="text-sm text-muted-foreground">Tổng số mocktest đã làm</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{averageScorePct}%</p>
            <p className="text-sm text-muted-foreground">Điểm trung bình</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{totalCompleted}</p>
            <p className="text-sm text-muted-foreground">Số bài hoàn thành</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
