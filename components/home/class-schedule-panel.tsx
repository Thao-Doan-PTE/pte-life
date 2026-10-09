import { getCurrentWeekDates } from "@/lib/week-utils";
import type { ClassWeekSession } from "@/lib/student-overview-queries";

const SESSION_STATUS_LABEL: Record<ClassWeekSession["status"], string> = {
  done: "Đã học",
  today: "Hôm nay",
  tomorrow: "Ngày mai",
  upcoming: "Sắp tới",
};

export function ClassWeekStrip({ sessions }: { sessions: ClassWeekSession[] }) {
  const week = getCurrentWeekDates();
  const sessionDates = new Set(sessions.map((s) => s.dateLabel));

  return (
    <div className="grid grid-cols-7 gap-1">
      {week.map((d, i) => {
        const dateLabel = `${String(d.dayOfMonth).padStart(2, "0")}`;
        const hasSession = Array.from(sessionDates).some((label) => label.startsWith(dateLabel + "/"));
        return (
          <div key={i} className="flex flex-col items-center gap-1 py-1.5" style={d.isToday ? { background: "var(--rail-red-tint)" } : undefined}>
            <span className="text-xs" style={{ color: "var(--rail-ink-dim)" }}>
              {d.weekdayLabel}
            </span>
            <span className="text-[14px] font-semibold" style={{ color: d.isToday ? "var(--rail-red)" : "var(--rail-charcoal)" }}>
              {d.dayOfMonth}
            </span>
            <span className="size-1.5 rounded-full" style={{ background: hasSession ? "var(--rail-red)" : "transparent" }} />
          </div>
        );
      })}
    </div>
  );
}

export function ClassScheduleList({ sessions }: { sessions: ClassWeekSession[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {sessions.map((s, i) => (
        <li
          key={i}
          className="flex items-start justify-between gap-3 rounded-lg px-3 py-2"
          style={{ background: s.status === "today" || s.status === "tomorrow" ? "var(--rail-red-tint)" : "var(--rail-surface)" }}
        >
          <div className="min-w-0">
            <p className="m-0 text-[15px] font-medium" style={{ color: "var(--rail-ink)" }}>
              {s.weekdayLabel} · {s.dateLabel}
            </p>
            {s.timeRange && (
              <p className="m-0 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
                {s.timeRange}
              </p>
            )}
          </div>
          <span
            className="mt-0.5 shrink-0 px-2 py-0.5 text-xs font-bold"
            style={
              s.status === "done"
                ? { color: "var(--rail-ok)" }
                : s.status === "today" || s.status === "tomorrow"
                  ? { background: "var(--rail-red)", color: "var(--rail-cta-text)" }
                  : { background: "var(--rail-red-tint)", color: "var(--rail-red-text)" }
            }
          >
            {s.status === "done" ? "✓ " : ""}
            {SESSION_STATUS_LABEL[s.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}
