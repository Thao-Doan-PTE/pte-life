"use client";

import { useActionState } from "react";
import { restoreQuestionFormAction, type QuestionDeleteState } from "@/lib/actions/admin-questions";

/** Nút "Khôi phục" 1 câu đã ẩn (chỉ người có quyền sửa ngân hàng đề). Kết quả gửi
 * lên `onResult` để danh sách hiện thông báo (dòng có thể biến mất khi tắt lọc
 * "Hiện câu đã ẩn"); không có `onResult` thì nút tự hiện thông báo bên dưới. */
export function RestoreQuestionButton({
  id,
  code,
  onResult,
}: {
  id: string;
  code: string;
  onResult?: (state: QuestionDeleteState) => void;
}) {
  const [state, formAction, pending] = useActionState<QuestionDeleteState, FormData>(async (prev, formData) => {
    const result = await restoreQuestionFormAction(prev, formData);
    onResult?.(result);
    return result;
  }, null);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="adm-btn adm-btn-sm"
        aria-label={pending ? `Đang khôi phục câu ${code}` : `Khôi phục câu ${code}`}
      >
        {pending ? "Đang khôi phục…" : "Khôi phục"}
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
