import Link from "next/link";
import { Clock, Play } from "lucide-react";
import { QUESTION_TYPES, SKILL_LABELS_VI, type Skill } from "@/lib/question-types";
import { formatRelativeOrDate } from "@/lib/format";

export interface ResumeSessionInfo {
  id: string;
  mode: string;
  skill: string | null;
  questionTypeId: string | null;
  currentIndex: number;
  totalQuestions: number;
  startedAt: string;
}

function resumeTitle(session: ResumeSessionInfo): { title: string; subtitle: string } {
  if (session.mode === "question" && session.questionTypeId) {
    const type = QUESTION_TYPES.find((t) => t.id === session.questionTypeId);
    if (type) return { title: type.name, subtitle: `Question Test · ${SKILL_LABELS_VI[type.skill]}` };
  }
  if (session.mode === "section" && session.skill) {
    return { title: `Section Test`, subtitle: SKILL_LABELS_VI[session.skill as Skill] };
  }
  if (session.mode === "tu") {
    return { title: "Thi thử Đề Tủ", subtitle: "Write From Dictation · Repeat Sentence" };
  }
  return { title: "Full Test", subtitle: "Trọn bộ 4 kỹ năng" };
}

export function MocktestResumeCard({ resumeSession }: { resumeSession: ResumeSessionInfo | null }) {
  if (!resumeSession) {
    return (
      <div
        className="flex flex-col justify-between gap-2 rounded-xl p-3 shadow-sm sm:gap-4 sm:rounded-2xl sm:p-5"
        style={{ background: "var(--wfd-surface)" }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wide sm:text-[13px]" style={{ color: "var(--wfd-muted)" }}>
            Bắt đầu ngay
          </p>
          <p className="mt-1 text-[15px] font-extrabold sm:mt-2 sm:text-[20px]" style={{ color: "var(--wfd-ink)" }}>
            Chưa có bài đang làm dở
          </p>
          <p className="mt-0.5 hidden text-[15px] sm:mt-1 sm:block" style={{ color: "var(--wfd-muted)" }}>
            Chọn 1 trong 3 chế độ bên dưới để bắt đầu luyện tập.
          </p>
        </div>
        <Link
          href="#che-do"
          className="flex items-center justify-center gap-2 rounded-full py-2 text-[13px] font-bold text-white shadow-sm sm:py-3 sm:text-[15px]"
          style={{ background: "var(--wfd-red)" }}
        >
          Bắt đầu luyện →
        </Link>
      </div>
    );
  }

  const { title, subtitle } = resumeTitle(resumeSession);
  const current = resumeSession.currentIndex + 1;
  const pct = resumeSession.totalQuestions > 0 ? Math.round((current / resumeSession.totalQuestions) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl p-3 shadow-sm sm:gap-4 sm:rounded-2xl sm:p-5" style={{ background: "var(--wfd-surface)" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide sm:text-[13px]" style={{ color: "var(--wfd-muted)" }}>
          Đang làm dở
        </p>
        <p className="hidden items-center gap-1 text-[13px] sm:flex" style={{ color: "var(--wfd-muted)" }}>
          <Clock className="size-3" /> Lần cuối: {formatRelativeOrDate(resumeSession.startedAt)}
        </p>
      </div>

      <div>
        <p className="text-[17px] font-extrabold sm:text-2xl" style={{ color: "var(--wfd-ink)" }}>
          {title}
        </p>
        <p className="text-[13px] sm:text-[15px]" style={{ color: "var(--wfd-muted)" }}>
          {subtitle}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs font-semibold sm:text-[13px]" style={{ color: "var(--wfd-muted)" }}>
          <span>Tiến độ</span>
          <span>
            Câu {current}/{resumeSession.totalQuestions}
          </span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full sm:mt-1.5 sm:h-1.5" style={{ background: "var(--wfd-border)" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--wfd-red)" }} />
        </div>
      </div>

      <Link
        href={`/mocktest/session/${resumeSession.id}`}
        className="flex items-center justify-center gap-2 rounded-full py-2 text-[13px] font-bold text-white shadow-sm sm:py-3 sm:text-[15px]"
        style={{ background: "var(--wfd-red)" }}
      >
        <Play className="size-3.5 sm:size-4" fill="#fff" /> Làm tiếp
      </Link>

      <Link
        href="#che-do"
        className="hidden text-center text-[13px] font-medium transition-colors hover:underline sm:block"
        style={{ color: "var(--wfd-muted)" }}
      >
        Hoặc bắt đầu đề mới
      </Link>
    </div>
  );
}
