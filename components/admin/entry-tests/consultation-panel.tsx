import { EmptyState, MutedText, Panel, Pill } from "@/components/admin/admin-ui";
import { formatVnDate, formatVnDateTime } from "@/lib/admin/student-status";

export interface ConsultationRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferredDate: Date;
  timeSlot: string;
  topic: string;
  note: string | null;
  createdAt: Date;
}

const TOPIC_LABEL: Record<string, { label: string; tone: "plum" | "ok" }> = {
  consult: { label: "Tư vấn lộ trình", tone: "plum" },
  trial: { label: "Học thử miễn phí", tone: "ok" },
};

/** Yêu cầu tư vấn / học thử mới (ConsultationRequest status NEW) — chỉ đọc, chỉ
 * hiện cho Admin và Vận hành/CSKH. Chưa có thao tác đổi trạng thái (chưa có
 * server action cho việc này). */
export function ConsultationPanel({ rows, total }: { rows: ConsultationRow[]; total: number }) {
  return (
    <Panel
      title="Yêu cầu tư vấn mới"
      meta={total > rows.length ? `${rows.length}/${total} mới nhất` : `${total} yêu cầu`}
    >
      {rows.length === 0 ? (
        <EmptyState>Không có yêu cầu tư vấn mới.</EmptyState>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => {
            const topic = TOPIC_LABEL[r.topic] ?? { label: r.topic, tone: "plum" as const };
            return (
              <li
                key={r.id}
                className="flex flex-col gap-1 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
                style={{ borderColor: "var(--adm-line)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{r.name}</span>
                    <Pill tone={topic.tone}>{topic.label}</Pill>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
                    <a href={`tel:${r.phone}`} className="adm-num hover:underline">
                      {r.phone}
                    </a>
                    {r.email && <span className="truncate">{r.email}</span>}
                  </div>
                  {r.note && <MutedText className="line-clamp-2 block">Ghi chú: {r.note}</MutedText>}
                </div>
                <div className="shrink-0 text-[13px] sm:text-right">
                  <div className="adm-num font-semibold">
                    {formatVnDate(r.preferredDate)} · {r.timeSlot}
                  </div>
                  <MutedText className="adm-num">Gửi lúc {formatVnDateTime(r.createdAt)}</MutedText>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
