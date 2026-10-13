import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { can, getScopedClassIdsFor, requireAdminPage } from "@/lib/admin/permissions";
import { getAssignmentDetail } from "@/lib/admin/assignment-queries";
import { daysUntilExpiry, formatVnDate, formatVnDateTime } from "@/lib/admin/student-status";
import { AdminContent, AdminPageHeader, Kpi, PackageTag, Panel, Pill } from "@/components/admin/admin-ui";
import { DueHint, DueLabel } from "@/components/admin/assignments/due-label";
import { StatusActions } from "@/components/admin/assignments/status-form";
import { RecipientTable } from "@/components/admin/assignments/recipient-table";
import { AssignmentItemList } from "@/components/admin/assignments/item-list";
import { isClassAssignable, KIND_META, percent, STATUS_META } from "@/components/admin/assignments/assignment-meta";

/** Chi tiết 1 bài tập: thông tin + đóng/mở lại, câu hỏi, tiến độ từng học viên.
 * Bài tập của lớp ngoài phạm vi giáo viên → 404 (không lộ việc bài tồn tại). */
export default async function AdminAssignmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage("manageAssignments");
  const { id } = await params;
  const scope = await getScopedClassIdsFor(user, "manageAssignments");
  const a = await getAssignmentDetail(id, scope);
  if (!a) notFound();

  const kind = KIND_META[a.kind];
  const status = STATUS_META[a.status];
  const canGrade = can(user, "gradeSubmissions");
  const total = a.recipients.length;
  const completed = a.recipients.filter((r) => r.completedAt).length;
  const submitted = a.recipients.filter((r) => r.submittedCount > 0 || r.completedAt).length;
  const overdue = a.status === "OPEN" && a.dueAt !== null && daysUntilExpiry(a.dueAt) < 0;
  const gradingHref = `/admin/grading?assignment=${a.id}`;

  return (
    <>
      <AdminPageHeader
        title={a.title}
        sub={`Lớp ${a.class.code} · ${kind.label} · ${status.label}`}
        actions={
          <Link href="/admin/assignments" className="adm-btn adm-btn-sm adm-btn-ghost">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Danh sách bài tập</span>
            <span className="sr-only sm:hidden">Về danh sách bài tập</span>
          </Link>
        }
      />
      <AdminContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi
            label="Hoàn thành"
            value={
              <>
                {completed}
                <span className="text-[16px] font-normal" style={{ color: "var(--adm-ink-3)" }}>
                  /{total}
                </span>
              </>
            }
            hint={`${Math.round(percent(completed, total))}% học viên nộp đủ`}
          />
          <Kpi label="Đã nộp ≥1 câu" value={submitted} hint={`${total - submitted} học viên chưa nộp`} />
          <Kpi
            label="Chờ chấm"
            value={a.pendingTotal}
            alert={a.pendingTotal > 0}
            hint={a.pendingTotal > 0 ? "Mở hàng chờ Chấm bài" : "Không có bài chờ chấm"}
            href={a.pendingTotal > 0 && canGrade ? gradingHref : undefined}
          />
          <Kpi
            label="Hạn nộp"
            value={a.dueAt ? <span className="text-[20px]">{formatVnDate(a.dueAt)}</span> : "—"}
            hint={
              !a.dueAt ? (
                "Không đặt hạn"
              ) : a.status === "OPEN" ? (
                <DueHint dueAt={a.dueAt} status={a.status} />
              ) : (
                `Bài ${status.label.toLowerCase()}`
              )
            }
          />
        </div>

        <Panel
          title="Thông tin bài tập"
          meta={<Pill tone={status.tone}>{status.label}</Pill>}
          actions={
            <StatusActions
              assignmentId={a.id}
              status={a.status}
              title={a.title}
              classOpen={isClassAssignable(a.class.status)}
            />
          }
        >
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 p-4 text-[13.5px] md:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
            <dt style={{ color: "var(--adm-ink-3)" }}>Lớp</dt>
            <dd className="flex min-w-0 flex-wrap items-center gap-1.5">
              <Link href={`/admin/classes/${a.class.id}`} className="adm-num font-semibold hover:underline">
                {a.class.code}
              </Link>
              <span className="truncate" style={{ color: "var(--adm-ink-2)" }}>
                {a.class.name}
              </span>
              <PackageTag pkg={a.class.examType} />
            </dd>
            <dt style={{ color: "var(--adm-ink-3)" }}>Hình thức</dt>
            <dd>
              <Pill tone={kind.tone}>{kind.label}</Pill>
            </dd>
            <dt style={{ color: "var(--adm-ink-3)" }}>Dạng bài</dt>
            <dd className="flex flex-wrap gap-1.5">
              {a.typeCodes.map((code) => (
                <span key={code} className="adm-tag">
                  {code}
                </span>
              ))}
            </dd>
            <dt style={{ color: "var(--adm-ink-3)" }}>Số câu</dt>
            <dd className="adm-num">{a.items.length} câu</dd>
            <dt style={{ color: "var(--adm-ink-3)" }}>Hạn nộp</dt>
            <dd>
              <DueLabel dueAt={a.dueAt} status={a.status} inline />
            </dd>
            <dt style={{ color: "var(--adm-ink-3)" }}>Thông báo</dt>
            <dd>{a.notify ? "Có — sẽ gửi khi tính năng thông báo ra mắt" : "Không"}</dd>
            <dt style={{ color: "var(--adm-ink-3)" }}>Người giao</dt>
            <dd className="min-w-0">
              {a.createdByName}{" "}
              <span className="adm-num text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                · {formatVnDateTime(a.createdAt)}
              </span>
            </dd>
            {a.note && (
              <>
                <dt style={{ color: "var(--adm-ink-3)" }}>Ghi chú</dt>
                <dd className="whitespace-pre-line break-words md:col-span-3">{a.note}</dd>
              </>
            )}
          </dl>
        </Panel>

        <div className="grid grid-cols-1 items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <Panel title="Câu hỏi" meta={`${a.items.length} câu`}>
            <AssignmentItemList items={a.items} />
          </Panel>
          <Panel
            title="Học viên"
            meta={`${completed}/${total} hoàn thành`}
            actions={
              a.pendingTotal > 0 && canGrade ? (
                <Link href={gradingHref} className="adm-btn adm-btn-sm adm-btn-pri">
                  Chấm {a.pendingTotal} bài
                </Link>
              ) : undefined
            }
          >
            <RecipientTable
              assignmentId={a.id}
              recipients={a.recipients}
              itemCount={a.items.length}
              overdue={overdue}
              canGrade={canGrade}
            />
          </Panel>
        </div>
      </AdminContent>
    </>
  );
}
