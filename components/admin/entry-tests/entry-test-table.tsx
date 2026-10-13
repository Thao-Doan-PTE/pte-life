import Link from "next/link";
import { EmptyState, MutedText, PersonCell, Pill } from "@/components/admin/admin-ui";
import { formatVnDateTime } from "@/lib/admin/student-status";
import { ENTRY_TEST_SCALE, type EntryTestAdminRow } from "@/lib/admin/entry-test-admin-queries";

/** Bảng kết quả test đầu vào. Điểm là thang thô của đề hiện tại (không phải PTE
 * 10–90): chỉ phần tự chấm có điểm, Speaking/Listening chờ giáo viên chấm. */
export function EntryTestTable({
  rows,
  showActions,
  emptyText,
}: {
  rows: EntryTestAdminRow[];
  /** Hiện nút "Xếp lớp" (người có quyền xem Học viên & gói học). Nút "Xem bài"
   * (trang chi tiết) luôn hiện cho mọi người có quyền xem test đầu vào. */
  showActions: boolean;
  emptyText: string;
}) {
  if (rows.length === 0) return <EmptyState>{emptyText}</EmptyState>;

  const teacherLabel = ENTRY_TEST_SCALE.teacherSections.map((s) => s.name).join(" / ") || "Speaking / Listening";

  return (
    <div className="adm-tw">
      <table className="adm-table min-w-[1040px]">
        <thead>
          <tr>
            <th scope="col">Người làm test</th>
            <th scope="col">Ngày nộp</th>
            <th scope="col" className="text-right">
              Điểm tự chấm
            </th>
            <th scope="col">Trình độ</th>
            <th scope="col">{teacherLabel}</th>
            <th scope="col">Lộ trình gợi ý</th>
            <th scope="col">Xếp lớp</th>
            <th scope="col">
              <span className="sr-only">Hành động</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const auto = r.scoreAuto ?? 0;
            const pct = ENTRY_TEST_SCALE.autoMax > 0 ? Math.round((auto / ENTRY_TEST_SCALE.autoMax) * 100) : 0;
            const graded = r.status === "GRADED";
            const detailHref = `/admin/entry-tests/${encodeURIComponent(r.id)}`;
            return (
              <tr key={r.id}>
                <td className="min-w-[220px]">
                  <Link href={detailHref} className="block rounded-md hover:opacity-80" title="Xem chi tiết bài test">
                    <PersonCell
                      name={r.user.name}
                      email={r.user.email}
                      extra={r.isProspect ? <Pill tone="plum">Khách tiềm năng</Pill> : undefined}
                    />
                  </Link>
                </td>
                <td className="adm-num whitespace-nowrap">
                  {r.submittedAt ? formatVnDateTime(r.submittedAt) : "—"}
                  {r.autoSubmitted && (
                    <div>
                      <MutedText>Tự nộp khi hết giờ</MutedText>
                    </div>
                  )}
                </td>
                <td className="text-right whitespace-nowrap">
                  <span className="adm-num font-semibold">
                    {r.scoreAuto == null ? "—" : auto}
                    <span style={{ color: "var(--adm-ink-3)" }}>/{ENTRY_TEST_SCALE.autoMax}</span>
                  </span>
                  {r.scoreAuto != null && (
                    <div>
                      <MutedText className="adm-num">{pct}%</MutedText>
                    </div>
                  )}
                </td>
                <td className="min-w-[150px]">
                  {r.level ? <span className="font-semibold">{r.level}</span> : <MutedText>—</MutedText>}
                </td>
                <td className="whitespace-nowrap">
                  {graded ? (
                    <div className="flex flex-col items-start gap-0.5">
                      <Pill tone="ok">Đã chấm</Pill>
                      {r.scoreTotal != null && (
                        <MutedText className="adm-num">
                          Tổng {r.scoreTotal}/{ENTRY_TEST_SCALE.totalMax}
                        </MutedText>
                      )}
                    </div>
                  ) : (
                    <Pill tone="warn">Chờ giáo viên chấm</Pill>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <MutedText>Cần cấu hình ngưỡng</MutedText>
                </td>
                <td className="min-w-[130px]">
                  {r.isPlaced ? (
                    <div className="flex flex-col items-start gap-0.5">
                      <Pill tone="ok">Đã xếp lớp</Pill>
                      {r.activeClasses.length > 0 && (
                        <MutedText>{r.activeClasses.map((c) => c.code).join(", ")}</MutedText>
                      )}
                    </div>
                  ) : (
                    <Pill tone="warn">Chưa xếp lớp</Pill>
                  )}
                </td>
                <td className="text-right whitespace-nowrap">
                  <div className="inline-flex items-center gap-2">
                    <Link href={detailHref} className="adm-btn adm-btn-sm" aria-label={`Xem bài test của ${r.user.name}`}>
                      Xem bài
                    </Link>
                    {showActions && !r.isPlaced && (
                      <Link
                        href={`/admin/students?student=${encodeURIComponent(r.user.id)}`}
                        className="adm-btn adm-btn-sm adm-btn-pri"
                        aria-label={`Xếp lớp cho ${r.user.name}`}
                      >
                        Xếp lớp
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
