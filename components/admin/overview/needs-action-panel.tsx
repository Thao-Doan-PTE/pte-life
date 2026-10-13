import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState, PackageTag, Panel } from "@/components/admin/admin-ui";
import { formatVnDate, formatVnDateTime, getStudentStatus } from "@/lib/admin/student-status";
import type { ExpiringStudentTodo, PendingGradingTodo, UnplacedEntryTestTodo } from "@/lib/admin/overview-queries";

/** Tối đa số dòng hiện trong panel "Cần xử lý" (mỗi loại cũng lấy tối đa chừng này). */
export const TODO_LIMIT = 12;

/** Chia chỗ giữa các loại việc theo vòng: mỗi loại lần lượt nhận 1 dòng cho tới
 * khi hết chỗ → loại nào nhiều cũng được phần đều nhau, loại nào ít thì nhường
 * phần dư cho loại khác. */
function splitQuota(counts: number[], cap: number): number[] {
  const out = counts.map(() => 0);
  let left = cap;
  let progressed = true;
  while (left > 0 && progressed) {
    progressed = false;
    for (let i = 0; i < counts.length && left > 0; i++) {
      if (out[i] < counts[i]) {
        out[i] += 1;
        left -= 1;
        progressed = true;
      }
    }
  }
  return out;
}

type Stripe = "brand" | "warn" | "plum" | "ink-3";

function TodoRow({
  stripe,
  title,
  sub,
  action,
}: {
  stripe: Stripe;
  title: ReactNode;
  sub: ReactNode;
  action: { label: string; href: string; ariaLabel: string } | null;
}) {
  return (
    <li className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0" style={{ borderColor: "var(--adm-line)" }}>
      <span aria-hidden="true" className="w-1 shrink-0 self-stretch rounded" style={{ background: `var(--adm-${stripe})` }} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] break-words">{title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {sub}
        </div>
      </div>
      {action && (
        <Link href={action.href} className="adm-btn adm-btn-sm shrink-0" aria-label={action.ariaLabel}>
          {action.label}
        </Link>
      )}
    </li>
  );
}

function Dot() {
  return <span aria-hidden="true">·</span>;
}

export function NeedsActionPanel({
  expiring,
  expiringCounts,
  expiringAllHref,
  pending,
  pendingTotal,
  pendingAllHref,
  unplaced,
  unplacedTotal,
  unplacedAllHref,
  canOpenStudent,
  unplacedFallbackHref,
}: {
  /** null = người xem không phụ trách loại việc này (ẩn hẳn). */
  expiring: ExpiringStudentTodo[] | null;
  /** Cùng điều kiện với danh sách expiring (getExpiringStudentCounts). */
  expiringCounts: { expired: number; soon: number; total: number };
  /** Danh sách học viên "Cần xử lý" (lọc theo đúng expiringStudentsWhere → cùng
   * số với expiringCounts.total). null = không mở được. */
  expiringAllHref: string | null;
  /** Bài chờ chấm, cũ nhất trước. null = người xem không chấm bài (ẩn hẳn). */
  pending: PendingGradingTodo[] | null;
  /** Tổng bài chờ chấm trong phạm vi (countPendingGrading). */
  pendingTotal: number;
  pendingAllHref: string | null;
  unplaced: UnplacedEntryTestTodo[] | null;
  unplacedTotal: number;
  unplacedAllHref: string | null;
  /** Người xem mở được hồ sơ học viên (/admin/students). */
  canOpenStudent: boolean;
  /** Nút "Xếp lớp" khi không mở được hồ sơ học viên (vd. /admin/entry-tests). */
  unplacedFallbackHref: string | null;
}) {
  const [nExp, nPen, nUnp] = splitQuota(
    [expiring?.length ?? 0, pending?.length ?? 0, unplaced?.length ?? 0],
    TODO_LIMIT
  );
  const expRows = (expiring ?? []).slice(0, nExp);
  const penRows = (pending ?? []).slice(0, nPen);
  const unpRows = (unplaced ?? []).slice(0, nUnp);
  const total = (expiring ? expiringCounts.total : 0) + (pending ? pendingTotal : 0) + (unplaced ? unplacedTotal : 0);

  const moreLinks: { href: string; label: string }[] = [];
  if (expiring && expiringAllHref && expRows.length < expiringCounts.total) {
    moreLinks.push({ href: expiringAllHref, label: `Xem tất cả ${expiringCounts.total} học viên cần gia hạn` });
  }
  if (pending && pendingAllHref && penRows.length < pendingTotal) {
    moreLinks.push({ href: pendingAllHref, label: `Xem tất cả ${pendingTotal} bài chờ chấm` });
  }
  if (unplaced && unplacedAllHref && unpRows.length < unplacedTotal) {
    moreLinks.push({ href: unplacedAllHref, label: `Xem tất cả ${unplacedTotal} test đầu vào chưa xếp lớp` });
  }

  return (
    <Panel title="Cần xử lý" meta={`${total} việc`}>
      {expRows.length + penRows.length + unpRows.length === 0 ? (
        <EmptyState>Không còn việc tồn. Tốt lắm!</EmptyState>
      ) : (
        <ul>
          {expRows.map((s) => {
            const expired = getStudentStatus(s.expiresAt).key === "expired";
            return (
              <TodoRow
                key={`exp-${s.id}`}
                stripe={expired ? "brand" : "warn"}
                title={
                  <>
                    <b className="font-semibold">{s.name}</b> · {expired ? "đã hết hạn" : "hết hạn"}{" "}
                    <span className="adm-num">{formatVnDate(s.expiresAt)}</span>
                  </>
                }
                sub={
                  <>
                    <PackageTag pkg={s.examPackage} />
                    <span>Bảo lưu còn {s.reservationsLeft} lượt</span>
                    <Dot />
                    <span>{s.classCode ? `lớp ${s.classCode}` : "chưa xếp lớp"}</span>
                  </>
                }
                action={
                  canOpenStudent
                    ? {
                        label: "Xử lý",
                        href: `/admin/students?student=${encodeURIComponent(s.id)}`,
                        ariaLabel: `Xử lý — ${s.name}`,
                      }
                    : null
                }
              />
            );
          })}
          {penRows.map((p) => (
            <TodoRow
              key={`pen-${p.attemptId}`}
              stripe="plum"
              title={
                <>
                  <b className="font-semibold">{p.typeName}</b> · {p.studentName}
                </>
              }
              sub={
                <>
                  <span>
                    Nộp <span className="adm-num">{formatVnDateTime(p.submittedAt)}</span>
                  </span>
                  {p.classCode && (
                    <>
                      <Dot />
                      <span>lớp {p.classCode}</span>
                    </>
                  )}
                </>
              }
              action={{
                label: "Chấm",
                href: `/admin/grading?attempt=${encodeURIComponent(p.attemptId)}`,
                ariaLabel: `Chấm bài ${p.typeName} — ${p.studentName}`,
              }}
            />
          ))}
          {unpRows.map((e) => {
            const href = canOpenStudent ? `/admin/students?student=${encodeURIComponent(e.userId)}` : unplacedFallbackHref;
            return (
              <TodoRow
                key={`unp-${e.userId}`}
                stripe="ink-3"
                title={
                  <>
                    <b className="font-semibold">{e.name}</b> · test đầu vào{" "}
                    {e.score !== null ? (
                      <>
                        <span className="adm-num">{e.score}</span> điểm
                      </>
                    ) : (
                      "chưa có điểm"
                    )}
                  </>
                }
                sub={
                  <>
                    <span>{e.level ?? "Chưa xếp trình độ"}</span>
                    {e.submittedAt && (
                      <>
                        <Dot />
                        <span>
                          nộp <span className="adm-num">{formatVnDate(e.submittedAt)}</span>
                        </span>
                      </>
                    )}
                  </>
                }
                action={href ? { label: "Xếp lớp", href, ariaLabel: `Xếp lớp — ${e.name}` } : null}
              />
            );
          })}
        </ul>
      )}
      {moreLinks.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t px-4 py-3 text-[13px]" style={{ borderColor: "var(--adm-line)" }}>
          {moreLinks.map((l) => (
            <Link key={l.href} href={l.href} className="font-semibold hover:underline" style={{ color: "var(--adm-brand-text)" }}>
              {l.label} →
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}
