"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { bulkDeleteQuestionsFormAction, type QuestionDeleteState } from "@/lib/actions/admin-questions";
import { DeleteQuestionButton } from "@/components/admin/delete-question-button";
import { RestoreQuestionButton } from "@/components/admin/question-bank/restore-question-button";
import { Pill } from "@/components/admin/admin-ui";
import { formatVnDate } from "@/lib/admin/student-status";

interface QuestionRow {
  id: string;
  code: string;
  availableIn: string[];
  bank: "PTE" | "TU";
  createdAt: string;
  /** ISO — khác null = câu đã ẩn (không xoá hẳn được vì đang nằm trong bài tập). */
  archivedAt: string | null;
  /** Câu đang nằm trong bài tập: xoá sẽ thành ẩn. */
  inAssignments: boolean;
}

const PACKAGE_SHORT: Record<string, string> = { academic: "Academic", core: "Core" };

/** Câu có thể tick để xoá hàng loạt: câu đã ẩn mà vẫn nằm trong bài tập thì xoá
 * cũng chỉ ẩn lại (không có tác dụng) nên không cho chọn. */
function isSelectable(q: QuestionRow): boolean {
  return !(q.archivedAt && q.inAssignments);
}

/** Lời xác nhận xoá hàng loạt: câu đang nằm trong bài tập được ẩn (có thể khôi
 * phục) thay vì xoá — chỉ phần câu xoá thật mới ghi "không thể hoàn tác". */
function bulkConfirmText(total: number, inUse: number): string {
  const free = total - inUse;
  if (inUse === 0) return `Xoá ${total} câu đã chọn? Các câu sẽ bị xoá vĩnh viễn, không thể hoàn tác.`;
  if (free === 0) {
    return `${total} câu đã chọn đang nằm trong bài tập nên sẽ được ẩn khỏi ngân hàng đề thay vì xoá. Có thể khôi phục lại sau. Tiếp tục?`;
  }
  return [
    `Xoá ${total} câu đã chọn?`,
    `• ${free} câu sẽ bị xoá vĩnh viễn, không thể hoàn tác.`,
    `• ${inUse} câu đang nằm trong bài tập sẽ được ẩn thay vì xoá (có thể khôi phục lại sau).`,
  ].join("\n");
}

/** Danh sách câu của 1 dạng. `canEdit` = có quyền sửa ngân hàng đề: hiện ô chọn,
 * xoá từng câu, xoá hàng loạt và khôi phục câu đã ẩn; không có quyền thì chỉ xem. */
export function QuestionBulkList({
  questions,
  questionTypeId,
  canEdit = true,
}: {
  questions: QuestionRow[];
  questionTypeId: string;
  canEdit?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  // Thông báo kết quả thao tác gần nhất (xoá 1 câu / xoá hàng loạt / khôi phục) —
  // giữ ở danh sách vì dòng của câu vừa xoá/ẩn sẽ biến mất sau khi tải lại dữ liệu.
  const [notice, setNotice] = useState<QuestionDeleteState>(null);
  const searchId = useId();

  const [, bulkAction, bulkPending] = useActionState<QuestionDeleteState, FormData>(async (prev, formData) => {
    const result = await bulkDeleteQuestionsFormAction(prev, formData);
    setNotice(result);
    if (result?.success) setSelected(new Set());
    return result;
  }, null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? questions.filter((x) => x.code.toLowerCase().includes(q)) : questions;
  }, [questions, query]);
  const selectable = visible.filter(isSelectable);

  // Chỉ tính các câu đang hiển thị, chọn được và đã tick — câu bị ẩn bởi ô tìm kiếm
  // (hoặc vừa bị xoá) không bao giờ được gửi đi, tránh xoá nhầm.
  const selectedRows = selectable.filter((q) => selected.has(q.id));
  const selectedIds = selectedRows.map((q) => q.id);
  const selectedInUse = selectedRows.filter((q) => q.inAssignments).length;
  const allSelected = selectable.length > 0 && selectedIds.length === selectable.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectable.map((q) => q.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Vùng role="status" luôn nằm trong cây trợ năng (kể cả khi rỗng) để trình đọc
  // màn hình đọc được cả thông báo đầu tiên; lỗi dùng role="alert".
  const noticeArea = (
    <>
      <div role="status" aria-live="polite">
        {notice?.success && (
          <div
            className="flex items-start justify-between gap-2 border-b px-4 py-2 text-[13px] font-medium"
            style={{ background: "var(--adm-ok-soft)", color: "var(--adm-ok)", borderColor: "var(--adm-line)" }}
          >
            <p className="min-w-0">{notice.success}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 text-[12.5px] underline"
              aria-label="Đóng thông báo"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
      {notice?.error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-2 border-b px-4 py-2 text-[13px] font-medium"
          style={{ background: "var(--adm-brand-soft)", color: "var(--adm-brand-text)", borderColor: "var(--adm-line)" }}
        >
          <p className="min-w-0">{notice.error}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="shrink-0 text-[12.5px] underline"
            aria-label="Đóng thông báo lỗi"
          >
            Đóng
          </button>
        </div>
      )}
    </>
  );

  if (questions.length === 0) {
    return (
      <div className="flex flex-col">
        {noticeArea}
        <p className="px-4 py-8 text-center text-[13.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Chưa có câu hỏi nào cho dạng này.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5"
        style={{ borderColor: "var(--adm-line)" }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {canEdit && (
            <label className="flex items-center gap-2 text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={selectable.length === 0}
                className="size-4"
                style={{ accentColor: "var(--adm-brand)" }}
              />
              Chọn tất cả ({selectable.length})
            </label>
          )}
          <label htmlFor={searchId} className="sr-only">
            Tìm theo mã câu
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm mã câu…"
            className="adm-input w-44"
            style={{ padding: "4px 10px", fontSize: 13 }}
          />
          {query && (
            <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              {visible.length}/{questions.length} câu
            </span>
          )}
        </div>

        {canEdit && selectedIds.length > 0 && (
          <form
            action={bulkAction}
            onSubmit={(e) => {
              if (!confirm(bulkConfirmText(selectedIds.length, selectedInUse))) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="questionTypeId" value={questionTypeId} />
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="ids" value={id} />
            ))}
            <button
              type="submit"
              disabled={bulkPending}
              aria-disabled={bulkPending}
              className="adm-btn adm-btn-sm adm-btn-danger"
            >
              {bulkPending ? "Đang xoá…" : `Xoá đã chọn (${selectedIds.length})`}
            </button>
          </form>
        )}
      </div>

      {noticeArea}

      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Không có mã câu nào khớp “{query}”.
        </p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((q) => {
            const archived = q.archivedAt !== null;
            return (
              <li
                key={q.id}
                className="flex items-center gap-3 border-b px-4 py-2 text-[13.5px] last:border-b-0"
                style={{ borderColor: "var(--adm-line)", background: archived ? "var(--adm-surface)" : undefined }}
              >
                {canEdit &&
                  (isSelectable(q) ? (
                    <input
                      type="checkbox"
                      checked={selected.has(q.id)}
                      onChange={() => toggleOne(q.id)}
                      aria-label={`Chọn câu ${q.code}`}
                      className="size-4 shrink-0"
                      style={{ accentColor: "var(--adm-brand)" }}
                    />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden="true" />
                  ))}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span
                    className="font-semibold break-all"
                    style={archived ? { color: "var(--adm-ink-3)" } : undefined}
                  >
                    {q.code}
                  </span>
                  <span className={q.bank === "TU" ? "adm-tag adm-tag-ac" : "adm-tag"}>
                    {q.bank === "TU" ? "Tủ" : "PTE"}
                  </span>
                  {archived && <Pill tone="mute">Đã ẩn</Pill>}
                  <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                    {q.availableIn.map((p) => PACKAGE_SHORT[p] ?? p).join(" · ")} · {formatVnDate(q.createdAt)}
                    {q.inAssignments ? " · Đang nằm trong bài tập" : ""}
                    {archived && q.archivedAt ? ` · Ẩn ngày ${formatVnDate(q.archivedAt)}` : ""}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1">
                    {archived && <RestoreQuestionButton id={q.id} code={q.code} onResult={setNotice} />}
                    {/* Câu đã ẩn mà vẫn nằm trong bài tập: xoá chỉ ẩn lại → không hiện nút. */}
                    {isSelectable(q) && (
                      <DeleteQuestionButton
                        id={q.id}
                        questionTypeId={questionTypeId}
                        code={q.code}
                        inAssignments={q.inAssignments}
                        onResult={setNotice}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
