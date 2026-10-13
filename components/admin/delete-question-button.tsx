"use client";

import { useActionState } from "react";
import { deleteQuestionFormAction, type QuestionDeleteState } from "@/lib/actions/admin-questions";

/** Lời xác nhận xoá 1 câu. Câu đang nằm trong bài tập không xoá hẳn được — máy
 * chủ ẩn câu đó (có thể khôi phục), nên lời xác nhận nói rõ "ẩn" thay vì "không
 * thể hoàn tác". */
function confirmText(code: string, inAssignments: boolean): string {
  return inAssignments
    ? `Câu ${code} đang nằm trong bài tập nên sẽ được ẩn khỏi ngân hàng đề thay vì xoá. Có thể khôi phục lại sau. Tiếp tục?`
    : `Xoá câu hỏi ${code}? Câu sẽ bị xoá vĩnh viễn, không thể hoàn tác.`;
}

/** Nút xoá 1 câu. Kết quả (vd. "1 câu đang nằm trong bài tập nên được ẩn thay vì
 * xoá") được gửi lên `onResult` để danh sách hiện thông báo — dòng của câu vừa xoá
 * sẽ biến mất nên không hiện thông báo tại chỗ được. Không có `onResult` thì nút tự
 * hiện thông báo ngay bên dưới. */
export function DeleteQuestionButton({
  id,
  questionTypeId,
  code,
  inAssignments = false,
  onResult,
}: {
  id: string;
  questionTypeId: string;
  code: string;
  /** Câu đang nằm trong bài tập (xoá sẽ thành ẩn). */
  inAssignments?: boolean;
  onResult?: (state: QuestionDeleteState) => void;
}) {
  const [state, formAction, pending] = useActionState<QuestionDeleteState, FormData>(async (prev, formData) => {
    const result = await deleteQuestionFormAction(prev, formData);
    onResult?.(result);
    return result;
  }, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmText(code, inAssignments))) {
          e.preventDefault();
        }
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="questionTypeId" value={questionTypeId} />
      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="adm-btn adm-btn-sm adm-btn-ghost"
        style={{ color: "var(--adm-brand-text)" }}
        aria-label={pending ? `Đang xoá câu ${code}` : `Xoá câu ${code}`}
      >
        {pending ? "Đang xoá…" : "Xoá"}
      </button>
      {!onResult && state?.error && (
        <p role="alert" className="text-[12.5px] font-medium" style={{ color: "var(--adm-brand-text)" }}>
          {state.error}
        </p>
      )}
      {!onResult && state?.success && (
        <p role="status" className="text-[12.5px] font-medium" style={{ color: "var(--adm-ok)" }}>
          {state.success}
        </p>
      )}
    </form>
  );
}
