import { BarChart3, Target, AlarmClock, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardOverview } from "@/lib/mock-dashboard";

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function DeltaBadge({ value, unit, context }: { value: number; unit: string; context: string }) {
  const negative = value < 0;
  return (
    <span
      className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
        negative ? "text-destructive" : "text-green-600 dark:text-green-400"
      }`}
    >
      {value === 0 ? (
        <Minus className="size-3" />
      ) : negative ? (
        <ArrowDown className="size-3" />
      ) : (
        <ArrowUp className="size-3" />
      )}
      {value > 0 ? "+" : ""}
      {value}
      {unit} {context}
    </span>
  );
}

const ICON_STYLE = {
  accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  primary: "bg-red-500/10 text-red-500",
} as const;

export function OverviewStatsRow({ overview }: { overview: DashboardOverview }) {
  const {
    totalQuestions,
    overallAccuracyPct,
    accuracyDeltaPct,
    studyTimeTotalMin,
    studyTimeAvgPerDayMin,
  } = overview;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ICON_STYLE.accent}`}>
            <BarChart3 className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-tight">{totalQuestions}</p>
            <p className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Tổng số câu
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">Lũy kế</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ICON_STYLE.primary}`}>
            <Target className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-tight">{overallAccuracyPct}%</p>
            <p className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Độ chính xác
            </p>
          </div>
          <DeltaBadge value={accuracyDeltaPct} unit="%" context="tuần trước" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-3">
          <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ICON_STYLE.accent}`}>
            <AlarmClock className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xl font-bold leading-tight">{formatMinutes(studyTimeTotalMin)}</p>
            <p className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Thời gian luyện
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            TB {formatMinutes(studyTimeAvgPerDayMin)}/ngày
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
