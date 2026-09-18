import { TrendingDown, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WeeklyProgressChart } from "@/components/dashboard/weekly-progress-chart";
import { getInitials } from "@/lib/utils";
import type { ExamPackage } from "@/lib/question-types";
import type { DashboardOverview } from "@/lib/mock-dashboard";

export function DashboardOverviewHeader({
  name,
  examPackage,
  avatarUrl,
  overview,
  isReturningUser,
}: {
  name: string;
  examPackage: ExamPackage;
  avatarUrl: string | null;
  overview: DashboardOverview;
  isReturningUser: boolean;
}) {
  const { scoreDelta2Weeks, currentStreak, weeklyTrend, weeklyAvgPerDay } = overview;
  const packageLabel = examPackage === "academic" ? "PTE Academic" : "PTE Core";

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card className="relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-white dark:from-red-950/25 dark:via-transparent dark:to-transparent">
        <CardContent className="relative flex items-center gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <Avatar className="size-16">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
              <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <Badge
              variant={examPackage === "academic" ? "default" : "outline"}
              className="px-2 py-0.5 text-[10px]"
            >
              {packageLabel}
            </Badge>
          </div>
          <div className="flex min-w-0 flex-col gap-3">
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">
                {isReturningUser ? (
                  <>
                    Welcome back, <span className="text-primary">{name}</span>{" "}
                  </>
                ) : (
                  <>
                    Xin chào, <span className="text-primary">{name}!</span>{" "}
                  </>
                )}
                <span className="animate-wave">👋</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Luyện đều mỗi ngày để giữ phong độ và tăng tỷ lệ trúng đề tủ.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: "#FFF1E0", color: "#C2410C" }}
              >
                🔥 {currentStreak} ngày liên tiếp
              </span>
              {scoreDelta2Weeks !== 0 && (
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${
                    scoreDelta2Weeks > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-destructive"
                  }`}
                >
                  {scoreDelta2Weeks > 0 ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  Tăng {scoreDelta2Weeks > 0 ? "+" : ""}
                  {scoreDelta2Weeks} điểm trong 2 tuần qua
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <WeeklyProgressChart trend={weeklyTrend} avgPerDay={weeklyAvgPerDay} />
        </CardContent>
      </Card>
    </div>
  );
}
