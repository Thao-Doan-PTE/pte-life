import { EmptyState } from "@/components/admin/admin-ui";
import type { AssignmentDetailItem } from "@/lib/admin/assignment-queries";

/** Danh sách câu hỏi của bài tập theo thứ tự làm bài. */
export function AssignmentItemList({ items }: { items: AssignmentDetailItem[] }) {
  if (items.length === 0) return <EmptyState>Bài tập chưa có câu hỏi nào.</EmptyState>;

  return (
    <ol aria-label="Câu hỏi trong bài tập">
      {items.map((item, index) => (
        <li
          key={item.questionId}
          className="flex gap-3 border-b px-4 py-2.5 last:border-b-0"
          style={{ borderColor: "var(--adm-line)" }}
        >
          <span className="adm-num w-6 shrink-0 pt-0.5 text-right text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="adm-num text-[13px] font-semibold">{item.code}</span>
              <span className="adm-tag">{item.typeCode}</span>
              {item.isTu && <span className="adm-tag adm-tag-ac">Tủ</span>}
              {item.archived && (
                <span className="text-[12px]" style={{ color: "var(--adm-warn)" }}>
                  · đã lưu trữ trong ngân hàng đề
                </span>
              )}
            </div>
            <p className="font-passage mt-0.5 text-[13px] leading-snug break-words" style={{ color: "var(--adm-ink-2)" }}>
              {item.excerpt}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
