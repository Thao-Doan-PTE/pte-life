import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState, MutedText, PackageTag, Panel, PersonCell, Pill } from "@/components/admin/admin-ui";
import {
  ATTEMPT_STATUS_META,
  CONSULTATION_STATUS_META,
  CONSULTATION_TOPIC_META,
  PURPOSE_LABEL,
} from "@/components/admin/entry-tests/entry-test-labels";
import { formatVnDate, formatVnDateTime } from "@/lib/admin/student-status";
import { ENTRY_TEST_SCALE, type EntryTestAttemptDetail } from "@/lib/admin/entry-test-admin-queries";
import { ENTRY_TEST_DURATION_MINUTES } from "@/lib/entry-test-data";

/** Các khối thông tin bên cạnh bài làm ở trang chi tiết test đầu vào: người làm
 * test, lượt test, thông tin đăng ký (lead) và yêu cầu tư vấn. Chỉ đọc. SĐT,
 * yêu cầu tư vấn và link hồ sơ chỉ được truyền vào khi người xem có quyền
 * viewStudents (trang kiểm tra, truy vấn không tải dữ liệu đó cho người khác). */

function InfoList({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-4 text-[13.5px]">{children}</dl>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt style={{ color: "var(--adm-ink-3)" }}>{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function formatDuration(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d} ngày ${h} giờ`;
  if (h > 0) return `${h} giờ ${m} phút`;
  return m > 0 ? `${m} phút ${s} giây` : `${s} giây`;
}

/** startedAt của lượt test là lúc tạo bản ghi (khi trang Test đầu vào được mở),
 * không phải lúc bấm bắt đầu, và đồng hồ 40 phút chỉ chạy ở trình duyệt → khoảng
 * thời gian dài hơn giới hạn (+2 phút dư) không phản ánh thời gian làm thật. */
const MAX_PLAUSIBLE_DURATION_SEC = ENTRY_TEST_DURATION_MINUTES * 60 + 120;

export function TakerPanel({ detail, canViewStudents }: { detail: EntryTestAttemptDetail; canViewStudents: boolean }) {
  const { user } = detail;
  return (
    <Panel title="Người làm test">
      <div className="px-4 pt-4">
        <PersonCell
          name={user.name}
          email={user.email}
          extra={detail.isProspect ? <Pill tone="plum">Khách tiềm năng</Pill> : undefined}
        />
      </div>
      <InfoList>
        <InfoRow label="Gói thi">
          <PackageTag pkg={user.examPackage} />
        </InfoRow>
        <InfoRow label="Xếp lớp">
          {detail.isPlaced ? (
            <div className="flex flex-col items-start gap-1">
              <Pill tone="ok">Đã xếp lớp</Pill>
              {detail.activeClasses.length > 0 && (
                <MutedText>{detail.activeClasses.map((c) => `${c.code} · ${c.name}`).join(", ")}</MutedText>
              )}
            </div>
          ) : (
            <Pill tone="warn">Chưa xếp lớp</Pill>
          )}
        </InfoRow>
      </InfoList>
      {canViewStudents && (
        <div className="flex flex-wrap gap-2 border-t px-4 py-3" style={{ borderColor: "var(--adm-line)" }}>
          <Link
            href={`/admin/students?student=${encodeURIComponent(user.id)}`}
            className={`adm-btn adm-btn-sm ${detail.isPlaced ? "" : "adm-btn-pri"}`}
          >
            Mở hồ sơ học viên
          </Link>
        </div>
      )}
    </Panel>
  );
}

export function AttemptInfoPanel({ detail }: { detail: EntryTestAttemptDetail }) {
  const status = ATTEMPT_STATUS_META[detail.status];
  const durationSec = detail.submittedAt
    ? Math.max(0, Math.round((detail.submittedAt.getTime() - detail.startedAt.getTime()) / 1000))
    : null;
  return (
    <Panel title="Lượt test">
      <InfoList>
        <InfoRow label="Trạng thái">
          <Pill tone={status.tone}>{status.label}</Pill>
        </InfoRow>
        <InfoRow label="Mở bài lúc">
          <span className="adm-num">{formatVnDateTime(detail.startedAt)}</span>
        </InfoRow>
        <InfoRow label="Nộp lúc">
          <span className="adm-num">{detail.submittedAt ? formatVnDateTime(detail.submittedAt) : "—"}</span>
        </InfoRow>
        <InfoRow label="Mở bài đến nộp">
          {durationSec == null ? (
            "—"
          ) : durationSec > MAX_PLAUSIBLE_DURATION_SEC ? (
            <MutedText>
              Không xác định (mở trang từ <span className="adm-num">{formatVnDateTime(detail.startedAt)}</span>, hệ thống
              chưa lưu giờ bắt đầu làm thật)
            </MutedText>
          ) : (
            <span className="adm-num">{formatDuration(durationSec)}</span>
          )}
        </InfoRow>
        <InfoRow label="Cách nộp">
          {detail.autoSubmitted ? <Pill tone="warn">Tự nộp khi hết giờ</Pill> : "Người làm test bấm nộp"}
        </InfoRow>
        <InfoRow label="Điểm tự chấm">
          <span className="adm-num font-semibold">
            {detail.scoreAuto ?? "—"}
            <span style={{ color: "var(--adm-ink-3)" }}>/{ENTRY_TEST_SCALE.autoMax}</span>
          </span>
        </InfoRow>
        <InfoRow label="Trình độ tạm xếp">{detail.level ?? "—"}</InfoRow>
        {detail.status === "GRADED" && (
          <InfoRow label="Giáo viên chấm">
            {detail.gradedByName ?? "—"}
            {detail.gradedAt && <MutedText className="adm-num"> · {formatVnDateTime(detail.gradedAt)}</MutedText>}
          </InfoRow>
        )}
      </InfoList>
    </Panel>
  );
}

export function LeadPanel({ detail, canViewStudents }: { detail: EntryTestAttemptDetail; canViewStudents: boolean }) {
  const { lead } = detail;
  const utm = lead ? [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" / ") : "";
  return (
    <Panel
      title="Thông tin đăng ký"
      meta={detail.leadCount > 1 ? `${detail.leadCount} lần đăng ký · hiện lần mới nhất` : undefined}
    >
      {!lead ? (
        <EmptyState>Không có đăng ký Test đầu vào nào khớp email này (tài khoản không tạo qua form đăng ký test).</EmptyState>
      ) : (
        <InfoList>
          {lead.name.trim() !== detail.user.name.trim() && <InfoRow label="Tên khi đăng ký">{lead.name}</InfoRow>}
          {canViewStudents && (
            <InfoRow label="Số điện thoại">
              {lead.phone ? (
                <a href={`tel:${lead.phone}`} className="adm-num font-semibold hover:underline">
                  {lead.phone}
                </a>
              ) : (
                "—"
              )}
            </InfoRow>
          )}
          <InfoRow label="Điểm mục tiêu">
            <span className="adm-num font-semibold">{lead.targetScore || "—"}</span>
          </InfoRow>
          <InfoRow label="Mục đích thi">{PURPOSE_LABEL[lead.purpose] ?? lead.purpose}</InfoRow>
          <InfoRow label="Dự kiến thi">{lead.examTimeline || "—"}</InfoRow>
          <InfoRow label="Nguồn (UTM)">{utm ? <span className="adm-num text-[12.5px]">{utm}</span> : "—"}</InfoRow>
          <InfoRow label="Đăng ký lúc">
            <span className="adm-num">{formatVnDateTime(lead.createdAt)}</span>
          </InfoRow>
        </InfoList>
      )}
    </Panel>
  );
}

export function UserConsultationsPanel({ rows }: { rows: NonNullable<EntryTestAttemptDetail["consultations"]> }) {
  return (
    <Panel title="Yêu cầu tư vấn / học thử" meta={`${rows.length} yêu cầu`}>
      {rows.length === 0 ? (
        <EmptyState>Người làm test chưa gửi yêu cầu tư vấn / học thử nào.</EmptyState>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => {
            const topic = CONSULTATION_TOPIC_META[r.topic] ?? { label: r.topic, tone: "plum" as const };
            const status = CONSULTATION_STATUS_META[r.status] ?? { label: r.status, tone: "mute" as const };
            return (
              <li
                key={r.id}
                className="flex flex-col gap-1 border-b px-4 py-3 last:border-b-0"
                style={{ borderColor: "var(--adm-line)" }}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone={topic.tone}>{topic.label}</Pill>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </div>
                <div className="adm-num text-[13.5px] font-semibold">
                  {formatVnDate(r.preferredDate)} · {r.timeSlot}
                </div>
                <div className="flex flex-wrap gap-x-3 text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
                  <a href={`tel:${r.phone}`} className="adm-num hover:underline">
                    {r.phone}
                  </a>
                  <span className="adm-num" style={{ color: "var(--adm-ink-3)" }}>
                    Gửi lúc {formatVnDateTime(r.createdAt)}
                  </span>
                </div>
                {r.note && (
                  <p className="text-[12.5px] leading-relaxed break-words whitespace-pre-line" style={{ color: "var(--adm-ink-2)" }}>
                    Ghi chú: {r.note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
