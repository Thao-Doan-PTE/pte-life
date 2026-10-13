"use client";

import { useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, InitialsAvatar, PackageTag, ProgressBar } from "@/components/admin/admin-ui";
import { StudentDrawer } from "@/components/admin/students/student-drawer";
import { entryTargetLabel, targetSourceLabel } from "@/components/admin/students/student-format";
import type { PlaceableClass, StudentDetail, StudentRow } from "@/lib/admin/student-queries";

const NO_CLASSES: PlaceableClass[] = [];

/** Bảng học viên + drawer hồ sơ. Drawer mở ngay bằng dữ liệu của dòng, đồng thời
 * ghi ?student=<id> lên URL để server tải phần chi tiết (tiến độ kỹ năng, lịch sử…). */
export function StudentTable({
  rows,
  baseHref,
  selectedId,
  detail,
  placeableClasses,
  canManagePlans,
  canPlace,
}: {
  rows: StudentRow[];
  /** URL trang với bộ lọc hiện tại (chưa có ?student). */
  baseHref: string;
  selectedId: string | null;
  detail: StudentDetail | null;
  placeableClasses: PlaceableClass[];
  canManagePlans: boolean;
  canPlace: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(selectedId);
  // Mở drawer khi URL đổi từ nơi khác (VD link "Xử lý" ở Tổng quan). Việc đóng
  // do chính bảng này xử lý nên không đồng bộ chiều ngược lại (tránh nháy).
  const [syncedId, setSyncedId] = useState(selectedId);
  if (selectedId !== syncedId) {
    setSyncedId(selectedId);
    if (selectedId) setOpenId(selectedId);
  }

  const withStudent = (id: string) => `${baseHref}${baseHref.includes("?") ? "&" : "?"}student=${encodeURIComponent(id)}`;

  function open(id: string) {
    setOpenId(id);
    startTransition(() => router.replace(withStudent(id), { scroll: false }));
  }

  function close() {
    setOpenId(null);
    startTransition(() => router.replace(baseHref, { scroll: false }));
  }

  function onLinkClick(e: MouseEvent<HTMLAnchorElement>, id: string) {
    e.stopPropagation();
    // Giữ hành vi mở tab mới khi bấm kèm Ctrl/Cmd/Shift hoặc chuột giữa.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    open(id);
  }

  const openDetail = openId && detail && detail.row.id === openId ? detail : null;
  const openRow = openDetail?.row ?? rows.find((r) => r.id === openId) ?? null;
  // URL đã trỏ tới học viên này mà server không trả chi tiết → không tồn tại / ngoài phạm vi.
  const detailMissing = !!openId && openId === selectedId && !detail;

  return (
    <>
      <div className="adm-tw">
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">Học viên</th>
              <th scope="col">Gói</th>
              <th scope="col">Lớp</th>
              <th scope="col">Hết hạn</th>
              <th scope="col">Bảo lưu còn</th>
              <th scope="col">Đầu vào → mục tiêu</th>
              <th scope="col">Tiến độ</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState>Không có học viên khớp bộ lọc.</EmptyState>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  data-clickable
                  onClick={() => open(r.id)}
                >
                  <td className="min-w-[220px]">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <InitialsAvatar name={r.name} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={withStudent(r.id)}
                            scroll={false}
                            onClick={(e) => onLinkClick(e, r.id)}
                            className="truncate font-semibold underline-offset-2 hover:underline"
                            aria-label={`Mở hồ sơ ${r.name}`}
                          >
                            {r.name}
                          </Link>
                          {r.locked && <span className="adm-pill adm-pill-mute">Đã khoá</span>}
                        </div>
                        <div className="truncate text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                          {r.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <PackageTag pkg={r.examPackage} />
                  </td>
                  <td className="whitespace-nowrap">
                    {r.activeClass ? (
                      <span className="adm-num font-medium" title={r.activeClass.name}>
                        {r.activeClass.code}
                        {r.activeClasses.length > 1 && (
                          <span className="ml-1 text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                            +{r.activeClasses.length - 1}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: "var(--adm-ink-3)" }}>Chưa xếp</span>
                    )}
                  </td>
                  <td className="adm-num whitespace-nowrap">{r.expiresLabel}</td>
                  <td className="adm-num">{r.reservationsLeft}</td>
                  <td
                    className="whitespace-nowrap"
                    title={[r.entryTest?.level ?? "Chưa làm test đầu vào", targetSourceLabel(r)].join(" · ")}
                  >
                    {entryTargetLabel(r)}
                  </td>
                  <td className="min-w-[120px]">
                    {r.practice.avgScorePct === null ? (
                      <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                        Chưa luyện
                      </span>
                    ) : (
                      <div
                        className="flex items-center gap-2"
                        title={`Điểm trung bình ${r.practice.avgScorePct}% · ${r.practice.attempts} lượt làm bài`}
                      >
                        <span className="adm-num text-[12.5px]">{r.practice.avgScorePct}%</span>
                        <ProgressBar value={r.practice.avgScorePct} />
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`adm-pill ${r.status.pill}`}>{r.status.label}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <StudentDrawer
        openId={openId}
        row={openRow}
        detail={openDetail}
        detailMissing={detailMissing}
        placeableClasses={openDetail ? placeableClasses : NO_CLASSES}
        canManagePlans={canManagePlans}
        canPlace={canPlace}
        onClose={close}
      />
    </>
  );
}
