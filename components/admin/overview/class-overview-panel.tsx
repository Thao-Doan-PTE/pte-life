import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState, MutedText, PackageTag, Panel, ProgressBar } from "@/components/admin/admin-ui";
import { formatVnDate } from "@/lib/admin/student-status";
import { percentOf, type ClassOverviewRow } from "@/lib/admin/overview-queries";

/** Ngưỡng tô đỏ tỷ lệ nộp bài (HANDOFF mục 4.1: đỏ nếu < 60%). */
const LOW_SUBMISSION_PCT = 60;

/** Ô "số + thanh tiến độ" gọn trên 1 dòng; thanh chỉ để nhìn (số đã đọc được). */
function InlineProgress({ label, value, red = false }: { label: ReactNode; value: number; red?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="adm-num shrink-0 text-[13px] font-semibold">{label}</span>
      <div aria-hidden="true" className="min-w-[48px] flex-1">
        <ProgressBar value={value} red={red} />
      </div>
    </div>
  );
}

/** Panel "Tiến độ lớp" trên Tổng quan: số buổi đã học / tổng buổi và tỷ lệ nộp
 * bài trên các bài tập đang mở của từng lớp (đỏ nếu < 60%). Gói và giáo viên nằm
 * chung ô "Lớp" để bảng vừa cột phải hẹp. */
export function ClassOverviewPanel({
  rows,
  total,
  teacherOnly,
}: {
  rows: ClassOverviewRow[];
  /** Tổng số lớp đang học + sắp khai giảng (có thể nhiều hơn số dòng hiện). */
  total: number;
  teacherOnly: boolean;
}) {
  return (
    <Panel
      title="Tiến độ lớp"
      meta={`${total} lớp`}
      actions={
        <Link href="/admin/classes" className="adm-btn adm-btn-sm adm-btn-ghost">
          Xem tất cả
        </Link>
      }
    >
      {rows.length === 0 ? (
        <EmptyState>
          {teacherOnly ? "Bạn chưa được phân công lớp nào đang học hoặc sắp khai giảng." : "Chưa có lớp đang học hoặc sắp khai giảng."}
        </EmptyState>
      ) : (
        <>
          <div className="adm-tw">
            <table className="adm-table">
              <thead>
                <tr>
                  <th scope="col">Lớp</th>
                  <th scope="col">Sĩ số</th>
                  <th scope="col">Buổi</th>
                  <th scope="col">Nộp bài</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const rate = percentOf(c.completed, c.recipients);
                  return (
                    <tr key={c.id}>
                      <td className="min-w-[140px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link href={`/admin/classes/${c.id}`} className="font-semibold hover:underline" title={c.name}>
                            {c.code}
                          </Link>
                          <PackageTag pkg={c.examType} />
                        </div>
                        <MutedText className="block">
                          {c.teacherName ?? "Chưa có giáo viên chính"}
                          {c.status === "UPCOMING" &&
                            (c.startDate ? ` · khai giảng ${formatVnDate(c.startDate)}` : " · sắp khai giảng")}
                        </MutedText>
                      </td>
                      <td className="adm-num">{c.size}</td>
                      <td className="min-w-[110px]">
                        {c.sessionsTotal ? (
                          <InlineProgress
                            label={`${c.sessionsDone}/${c.sessionsTotal}`}
                            value={(100 * c.sessionsDone) / c.sessionsTotal}
                          />
                        ) : (
                          <MutedText>
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">Chưa nhập số buổi</span>
                          </MutedText>
                        )}
                      </td>
                      <td className="min-w-[110px]">
                        {rate === null ? (
                          <MutedText>
                            <span aria-hidden="true">—</span>
                            <span className="sr-only">
                              {c.openAssignments === 0 ? "Chưa có bài tập đang mở" : "Chưa có học viên phải nộp"}
                            </span>
                          </MutedText>
                        ) : (
                          <div>
                            <InlineProgress
                              label={
                                // Trang chi tiết lớp có panel "Bài tập" với số đã nộp từng bài
                                // (mọi vai trò xem Tổng quan đều có viewClasses, giáo viên theo phạm vi lớp).
                                <Link
                                  href={`/admin/classes/${encodeURIComponent(c.id)}`}
                                  className="hover:underline"
                                  aria-label={`${rate}% đã nộp — xem bài tập trong trang lớp ${c.code}`}
                                >
                                  {rate}%
                                </Link>
                              }
                              value={rate}
                              red={rate < LOW_SUBMISSION_PCT}
                            />
                            <MutedText className="adm-num mt-0.5 block">
                              {c.completed}/{c.recipients} lượt · {c.openAssignments} bài
                            </MutedText>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t px-4 py-2.5 text-[12px]" style={{ borderColor: "var(--adm-line)", color: "var(--adm-ink-3)" }}>
            Nộp bài: số lượt đã nộp / phải nộp của các bài tập đang mở; đỏ khi dưới {LOW_SUBMISSION_PCT}%.
          </p>
        </>
      )}
    </Panel>
  );
}
