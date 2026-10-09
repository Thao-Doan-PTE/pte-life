import Link from "next/link";
import { Flame, Target, Trophy } from "lucide-react";

export function MocktestQuickStats({
  streakDays,
  lastScore,
  weakestType,
}: {
  streakDays: number;
  lastScore: number | null;
  weakestType: { typeId: string; typeName: string; skill: string } | null;
}) {
  return (
    <div className="mt-2 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 sm:mt-4 sm:rounded-2xl">
      <div className="flex flex-col gap-0.5 p-2 sm:gap-1.5 sm:p-4">
        <p className="flex items-center gap-1 text-xs font-medium sm:gap-1.5 sm:text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          <Flame className="size-3 sm:size-3.5" style={{ color: "var(--wfd-amber)" }} />
          <span className="hidden sm:inline">Chuỗi ngày luyện</span>
          <span className="sm:hidden">Streak</span>
        </p>
        <p className="text-[15px] font-extrabold text-white sm:text-[20px]">{streakDays} ngày</p>
        <p className="hidden text-[13px] sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>
          {streakDays > 0 ? "Đang duy trì, đừng bỏ lỡ hôm nay!" : "Làm 1 câu hôm nay để bắt đầu chuỗi"}
        </p>
      </div>

      <div className="flex flex-col gap-0.5 p-2 sm:gap-1.5 sm:p-4">
        <p className="flex items-center gap-1 text-xs font-medium sm:gap-1.5 sm:text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          <Trophy className="size-3 sm:size-3.5" style={{ color: "#ff5b62" }} />
          <span className="hidden sm:inline">Điểm mock gần nhất</span>
          <span className="sm:hidden">Điểm mock</span>
        </p>
        <p className="truncate text-[15px] font-extrabold sm:text-[20px]" style={{ color: lastScore !== null ? "#fff" : "rgba(255,255,255,0.6)" }}>
          {lastScore !== null ? lastScore : "Chưa có"}
        </p>
        <Link
          href={lastScore !== null ? "/mocktest" : "#che-do"}
          className="hidden text-[13px] font-bold hover:underline sm:block"
          style={{ color: "#ff5b62" }}
        >
          {lastScore !== null ? "Xem lịch sử →" : "Làm Full Test đầu tiên →"}
        </Link>
      </div>

      <div className="flex flex-col gap-0.5 p-2 sm:gap-1.5 sm:p-4">
        <p className="flex items-center gap-1 text-xs font-medium sm:gap-1.5 sm:text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
          <Target className="size-3 sm:size-3.5" style={{ color: "#c4b5fd" }} />
          <span className="hidden sm:inline">Dạng cần cải thiện</span>
          <span className="sm:hidden">Dạng yếu</span>
        </p>
        <p className="truncate text-[15px] font-extrabold sm:text-[20px]" style={{ color: weakestType ? "#fff" : "rgba(255,255,255,0.6)" }}>
          {weakestType ? weakestType.typeName : "Chưa có dữ liệu"}
        </p>
        {weakestType ? (
          <Link
            href={`/practice/${weakestType.skill}/${weakestType.typeId}`}
            className="hidden text-[13px] font-bold hover:underline sm:block"
            style={{ color: "#ff5b62" }}
          >
            Luyện dạng này →
          </Link>
        ) : (
          <p className="hidden text-[13px] sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>
            Làm vài câu để thấy gợi ý ở đây
          </p>
        )}
      </div>
    </div>
  );
}
