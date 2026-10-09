import Link from "next/link";
import { StageCard, RedLink, GhostLink } from "@/components/home/stage-intro";

export interface TeachingClassInfo {
  id: string;
  name: string;
  examType: "academic" | "core";
  schedule: string | null;
  studentCount: number;
}

function ClassesCard({ classes }: { classes: TeachingClassInfo[] }) {
  if (classes.length === 0) {
    return (
      <StageCard>
        <p className="m-0 text-[13px] font-bold tracking-wide uppercase" style={{ color: "var(--rail-ink-dim)" }}>
          Lớp phụ trách
        </p>
        <p className="mt-1.5" style={{ color: "var(--rail-ink-dim)" }}>
          Bạn chưa được phân công lớp nào. Liên hệ đội học thuật để được xếp lớp.
        </p>
      </StageCard>
    );
  }

  return (
    <StageCard>
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <b className="text-[16px]" style={{ color: "var(--rail-charcoal)" }}>
          Lớp phụ trách
        </b>
        <span className="text-[13px] font-semibold" style={{ color: "var(--rail-ink-dim)" }}>
          {classes.length} lớp
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {classes.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0" style={{ borderColor: "var(--rail-line)" }}>
            <div className="min-w-0">
              <p className="m-0 truncate font-semibold" style={{ color: "var(--rail-charcoal)" }}>
                {c.name}
              </p>
              <p className="m-0 text-[15px]" style={{ color: "var(--rail-ink-dim)" }}>
                {c.examType === "academic" ? "PTE Academic" : "PTE Core"}
                {c.schedule ? ` · ${c.schedule}` : ""}
              </p>
            </div>
            <span className="shrink-0 px-2 py-0.5 text-[13px] font-semibold" style={{ background: "var(--rail-surface)", color: "var(--rail-ink)" }}>
              {c.studentCount} học viên
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <Link href="/admin/classes" className="text-[15px] font-semibold hover:underline" style={{ color: "var(--rail-red)" }}>
          Xem chi tiết lớp →
        </Link>
      </div>
    </StageCard>
  );
}

function TodoCard() {
  return (
    <StageCard>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <b className="text-[16px]" style={{ color: "var(--rail-charcoal)" }}>
          Bài chờ chấm & việc cần làm
        </b>
        <span className="px-2 py-0.5 text-xs font-semibold tracking-wide uppercase" style={{ background: "var(--rail-surface)", color: "var(--rail-ink-dim)" }}>
          Sắp ra mắt
        </span>
      </div>
      <p className="m-0 mb-4" style={{ color: "var(--rail-ink-dim)" }}>
        Tính năng giao bài và chấm bài đang được xây dựng. Khi ra mắt, bạn sẽ thấy tỷ lệ nộp bài theo lớp, bài chờ
        chấm và việc cần làm ở đây.
      </p>
      <div className="flex flex-wrap gap-3">
        <RedLink href="/giao-bai">Giao bài mới →</RedLink>
        <GhostLink href="/bai-cho-cham">Xem bài chờ chấm</GhostLink>
      </div>
    </StageCard>
  );
}

export function TeacherOverviewView({ classes }: { classes: TeachingClassInfo[] }) {
  return (
    <div>
      <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
        Tổng quan lớp
      </p>
      <h2 className="mt-2.5 mb-6 text-[clamp(24px,2.8vw,34px)] leading-[1.15] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
        {classes.length > 0 ? `Bạn đang phụ trách ${classes.length} lớp` : "Chưa có lớp được phân công"}
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ClassesCard classes={classes} />
        <TodoCard />
      </div>
    </div>
  );
}
