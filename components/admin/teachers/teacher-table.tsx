import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState, PersonCell, Pill } from "@/components/admin/admin-ui";
import { CLASS_STATUS_META } from "@/components/admin/classes/class-status";
import { TeacherSpecialtyCell } from "@/components/admin/teachers/teacher-specialty-cell";
import type { TeacherRosterRow } from "@/lib/admin/teacher-queries";

/** Bảng giáo viên (HANDOFF mục 4.7): chuyên môn · lớp phụ trách · số học viên ·
 * bài chờ chấm. */
export function TeacherTable({
  rows,
  emptyHint,
  canEditSpecialty,
  pendingHref,
}: {
  rows: TeacherRosterRow[];
  emptyHint?: ReactNode;
  /** Sửa chuyên môn ngay trong bảng (Admin / Trưởng học thuật). */
  canEditSpecialty: boolean;
  /** Link từ ô "Bài chờ chấm" sang trang Chấm bài (null = không có quyền mở trang đó). */
  pendingHref: string | null;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState>
        Chưa có tài khoản nào mang role Giáo viên.
        {emptyHint && <> {emptyHint}</>}
      </EmptyState>
    );
  }

  return (
    <div className="adm-tw">
      <table className="adm-table">
        <thead>
          <tr>
            <th scope="col">Giáo viên</th>
            <th scope="col">Chuyên môn</th>
            <th scope="col">Lớp phụ trách</th>
            <th scope="col">Số học viên</th>
            <th scope="col">Bài chờ chấm</th>
            <th scope="col">Trạng thái tài khoản</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td className="min-w-[220px]">
                <PersonCell name={t.name} email={t.email} />
              </td>
              <td className="max-w-[260px] min-w-[160px]">
                <TeacherSpecialtyCell
                  teacherId={t.id}
                  teacherName={t.name}
                  specialty={t.specialty}
                  canEdit={canEditSpecialty}
                />
              </td>
              <td className="min-w-[200px]">
                {t.openClasses.length === 0 ? (
                  <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                    Chưa phụ trách lớp nào
                  </span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5" aria-label={`Lớp ${t.name} phụ trách`}>
                    {t.openClasses.map((c) => {
                      const roleLabel = c.role === "MAIN" ? "Giáo viên chính" : "Trợ giảng";
                      return (
                        <li key={c.id}>
                          <Link
                            href={`/admin/classes/${c.id}`}
                            className="adm-tag adm-num hover:underline"
                            title={`${c.name} — ${roleLabel} · ${CLASS_STATUS_META[c.status].label}`}
                          >
                            {c.code}
                            {c.role === "ASSISTANT" ? (
                              <span className="ml-1 font-normal" style={{ color: "var(--adm-ink-3)" }}>
                                · trợ giảng
                              </span>
                            ) : (
                              <span className="sr-only"> (giáo viên chính)</span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {t.closedClassCount > 0 && (
                  <div className="mt-1 text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                    +{t.closedClassCount} lớp đã kết thúc
                  </div>
                )}
              </td>
              <td className="adm-num whitespace-nowrap">
                {t.studentCount > 0 ? (
                  t.studentCount
                ) : (
                  <span style={{ color: "var(--adm-ink-3)" }}>0</span>
                )}
              </td>
              <td className="whitespace-nowrap">
                {t.pendingGrading > 0 ? (
                  pendingHref ? (
                    <Link href={pendingHref} className="hover:underline" aria-label={`${t.pendingGrading} bài chờ chấm của ${t.name} — mở trang Chấm bài`}>
                      <Pill tone="warn">{t.pendingGrading} bài</Pill>
                    </Link>
                  ) : (
                    <Pill tone="warn">{t.pendingGrading} bài</Pill>
                  )
                ) : (
                  <Pill tone="ok">0</Pill>
                )}
              </td>
              <td className="whitespace-nowrap">
                {t.status === "ACTIVE" ? <Pill tone="ok">Hoạt động</Pill> : <Pill tone="bad">Đã khoá</Pill>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
