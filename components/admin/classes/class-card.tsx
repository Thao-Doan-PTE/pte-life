import Link from "next/link";
import { InitialsAvatar, PackageTag, Pill } from "@/components/admin/admin-ui";
import { CLASS_STATUS_META, PRACTICE_WINDOW_DAYS } from "@/components/admin/classes/class-status";
import { LabeledProgress, SessionProgress } from "@/components/admin/classes/labeled-progress";
import type { ClassStatus } from "@/lib/generated/prisma/enums";

export interface ClassCardData {
  id: string;
  code: string;
  name: string;
  examType: string;
  schedule: string | null;
  startDateLabel: string;
  status: ClassStatus;
  /** Tên giáo viên vai trò MAIN (null = lớp chưa có GV chính, kể cả khi đã có trợ giảng). */
  mainTeacher: string | null;
  /** Số giáo viên còn lại ngoài GV chính đang hiện (khi chưa có GV chính: toàn bộ là trợ giảng). */
  otherTeachers: number;
  students: { id: string; name: string }[];
  /** Tổng lượt luyện đề của học viên trong lớp, PRACTICE_WINDOW_DAYS ngày gần nhất. */
  practiceAttempts: number;
  /** Số học viên có luyện ít nhất 1 lượt trong khoảng đó. */
  practicingStudents: number;
  /** Số buổi đã học / tổng số buổi (null = chưa nhập). */
  sessionsDone: number;
  sessionsTotal: number | null;
  /** Số bài tập đang mở (status OPEN) của lớp. */
  openAssignments: number;
  /** Hiện nút "Giao bài cho lớp" (người xem có quyền giao bài và lớp thuộc phạm vi). */
  canAssign: boolean;
}

const AVATAR_LIMIT = 6;

/** Thẻ lớp trên trang Lớp học (HANDOFF mục 4.4). */
export function ClassCard({ data, showStudentListLink }: { data: ClassCardData; showStudentListLink: boolean }) {
  const status = CLASS_STATUS_META[data.status];
  const size = data.students.length;
  const titleId = `class-${data.id}-title`;

  return (
    <article className="adm-panel flex min-w-0 flex-col gap-3.5 p-4" aria-labelledby={titleId}>
      <div className="flex items-start gap-2">
        <h2 id={titleId} className="min-w-0 flex-1 text-[15px] leading-snug font-semibold text-balance">
          <Link href={`/admin/classes/${data.id}`} className="hover:underline">
            {data.name}
          </Link>
        </h2>
        <PackageTag pkg={data.examType} />
      </div>

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px]">
        <dt style={{ color: "var(--adm-ink-3)" }}>Mã lớp</dt>
        <dd className="adm-num truncate font-semibold">{data.code}</dd>
        <dt style={{ color: "var(--adm-ink-3)" }}>Giáo viên chính</dt>
        <dd className="truncate">
          {data.mainTeacher ? (
            <>
              {data.mainTeacher}
              {data.otherTeachers > 0 && (
                <span style={{ color: "var(--adm-ink-3)" }}> · +{data.otherTeachers} GV</span>
              )}
            </>
          ) : data.otherTeachers > 0 ? (
            <span style={{ color: "var(--adm-ink-3)" }}>
              Chưa có GV chính · +{data.otherTeachers} trợ giảng
            </span>
          ) : (
            <span style={{ color: "var(--adm-brand-text)" }}>Chưa phân công</span>
          )}
        </dd>
        <dt style={{ color: "var(--adm-ink-3)" }}>Lịch học</dt>
        <dd className="truncate">{data.schedule || "—"}</dd>
        <dt style={{ color: "var(--adm-ink-3)" }}>Khai giảng</dt>
        <dd className="adm-num">{data.startDateLabel}</dd>
        <dt style={{ color: "var(--adm-ink-3)" }}>Sĩ số</dt>
        <dd>
          <span className="adm-num">{size}</span> học viên
        </dd>
        <dt style={{ color: "var(--adm-ink-3)" }}>Bài đang mở</dt>
        <dd>
          {data.openAssignments > 0 ? (
            <>
              <span className="adm-num">{data.openAssignments}</span> bài
            </>
          ) : (
            <span style={{ color: "var(--adm-ink-3)" }}>Chưa có</span>
          )}
        </dd>
        <dt style={{ color: "var(--adm-ink-3)" }}>Trạng thái</dt>
        <dd>
          <Pill tone={status.tone}>{status.label}</Pill>
        </dd>
      </dl>

      <SessionProgress done={data.sessionsDone} total={data.sessionsTotal} classLabel={data.code} />

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
          <span style={{ color: "var(--adm-ink-3)" }}>Luyện đề {PRACTICE_WINDOW_DAYS} ngày</span>
          {size > 0 ? (
            <span className="adm-num">
              {data.practiceAttempts.toLocaleString("vi-VN")} lượt · {data.practicingStudents}/{size} HV
            </span>
          ) : (
            <span style={{ color: "var(--adm-ink-3)" }}>Chưa có học viên</span>
          )}
        </div>
        {size > 0 && (
          <div className="flex">
            <LabeledProgress
              value={data.practicingStudents}
              max={size}
              label={`Học viên lớp ${data.code} có luyện đề ${PRACTICE_WINDOW_DAYS} ngày`}
              valueText={`${data.practicingStudents} trên ${size} học viên`}
              red={data.practicingStudents / size < 0.5}
            />
          </div>
        )}
      </div>

      {size > 0 && (
        <ul className="flex items-center" aria-label={`Học viên lớp ${data.code}`}>
          {data.students.slice(0, AVATAR_LIMIT).map((s, i) => (
            <li
              key={s.id}
              title={s.name}
              className="rounded-full"
              style={{ marginLeft: i === 0 ? 0 : -6, boxShadow: "0 0 0 2px var(--adm-bg)" }}
            >
              <InitialsAvatar name={s.name} size={28} />
              <span className="sr-only">{s.name}</span>
            </li>
          ))}
          {size > AVATAR_LIMIT && (
            <li className="ml-2 text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              +{size - AVATAR_LIMIT}
              <span className="sr-only"> học viên khác</span>
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {data.canAssign && (
          <Link
            href={`/admin/assignments?class=${encodeURIComponent(data.id)}`}
            className="adm-btn adm-btn-pri adm-btn-sm"
          >
            Giao bài cho lớp
            <span className="sr-only"> {data.code}</span>
          </Link>
        )}
        {/* Chỉ 1 nút đỏ mỗi thẻ: có nút giao bài thì "Chi tiết lớp" thành nút thường. */}
        <Link
          href={`/admin/classes/${data.id}`}
          className={data.canAssign ? "adm-btn adm-btn-sm" : "adm-btn adm-btn-pri adm-btn-sm"}
        >
          Chi tiết lớp
          <span className="sr-only"> {data.code}</span>
        </Link>
        {showStudentListLink && (
          <Link href={`/admin/students?class=${encodeURIComponent(data.id)}`} className="adm-btn adm-btn-sm">
            Danh sách HV
            <span className="sr-only"> lớp {data.code}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
