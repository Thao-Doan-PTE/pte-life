"use client";

import { startTransition, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/** Gửi form qua onSubmit thay vì `<form action={fn}>`: với `action` là hàm, React 19
 * luôn reset form trước khi chạy action — kể cả khi action trả lỗi — nên người dùng
 * mất hết dữ liệu đã nhập (select quay về lựa chọn đầu). Gửi theo cách này thì
 * useFormStatus không chạy → truyền `pending` (isPending của useActionState) cho SubmitButton. */
export function useSubmitKeepingValues(formAction: (formData: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(formData));
  };
}

/** Nút gửi form có trạng thái "đang xử lý" (đặt bên trong <form>). */
export function SubmitButton({
  children,
  pendingLabel = "Đang lưu…",
  className,
  disabled,
  pending: pendingProp,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
  /** Trạng thái đang gửi khi form không dùng `action` (xem useSubmitKeepingValues). */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button type="submit" className={cn("adm-btn", className)} disabled={disabled || pending} aria-disabled={disabled || pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Nút gửi form cần xác nhận 2 bước (bỏ học viên/giáo viên, lưu trữ lớp):
 * bấm lần 1 → đổi thành "Xác nhận" + "Huỷ"; bấm "Xác nhận" mới gửi form.
 * Không tự quay về theo thời gian (WCAG 2.2.1) — chỉ huỷ khi bấm "Huỷ", nhấn Esc
 * hoặc chuyển focus sang phần tử khác ngoài cụm nút. Huỷ bằng "Huỷ"/Esc hoặc gửi xong
 * mà nút vẫn còn trên trang thì focus quay lại nút ban đầu (không rơi về <body>). */
export function ConfirmSubmitButton({
  label,
  confirmLabel = "Xác nhận",
  pendingLabel = "Đang xử lý…",
  className,
  srContext,
}: {
  label: string;
  confirmLabel?: string;
  pendingLabel?: string;
  className?: string;
  /** Mô tả thêm cho trình đọc màn hình, vd. tên học viên. */
  srContext?: string;
}) {
  const { pending } = useFormStatus();
  const [armed, setArmed] = useState(false);
  const [prevPending, setPrevPending] = useState(pending);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Đánh dấu cần trả focus về nút ban đầu sau khi thu cụm xác nhận lại.
  const restoreFocus = useRef(false);

  // Bắt đầu gửi form → bỏ trạng thái xác nhận để gửi xong không hiện lại "Xác nhận".
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (pending) setArmed(false);
  }

  useEffect(() => {
    if (pending) return;
    if (armed) {
      confirmRef.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [armed, pending]);

  const disarm = () => {
    restoreFocus.current = true;
    setArmed(false);
  };

  if (pending) {
    return (
      <button type="button" className={cn("adm-btn adm-btn-sm", className)} disabled>
        {pendingLabel}
      </button>
    );
  }

  if (!armed) {
    return (
      <button ref={triggerRef} type="button" className={cn("adm-btn adm-btn-sm", className)} onClick={() => setArmed(true)}>
        {label}
        {srContext && <span className="sr-only"> {srContext}</span>}
      </button>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          disarm();
        }
      }}
      onBlur={(e) => {
        // Chỉ huỷ khi focus đã sang một phần tử khác ngoài cụm nút. relatedTarget = null
        // (Safari không focus nút khi click, đổi cửa sổ…) thì giữ nguyên để không nuốt cú bấm.
        const next = e.relatedTarget as Node | null;
        if (next && !e.currentTarget.contains(next)) {
          // Người dùng chủ động rời đi → không kéo focus về nút ban đầu.
          restoreFocus.current = false;
          setArmed(false);
        }
      }}
    >
      <button
        ref={confirmRef}
        type="submit"
        className="adm-btn adm-btn-sm adm-btn-danger"
        onClick={() => {
          restoreFocus.current = true;
        }}
      >
        {confirmLabel}
        {srContext && <span className="sr-only"> {srContext}</span>}
      </button>
      <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={disarm}>
        Huỷ
        {srContext && <span className="sr-only"> {srContext}</span>}
      </button>
    </span>
  );
}

/** Dòng thông báo lỗi / thành công dưới form (kết quả useActionState). */
export function FormNotice({ state }: { state: { error?: string; success?: string } | null }) {
  if (state?.error) {
    return (
      <p
        role="alert"
        className="rounded-lg px-3 py-2 text-[13px] font-medium"
        style={{ background: "var(--adm-brand-soft)", color: "var(--adm-brand-text)" }}
      >
        {state.error}
      </p>
    );
  }
  if (state?.success) {
    return (
      <p
        role="status"
        className="rounded-lg px-3 py-2 text-[13px] font-medium"
        style={{ background: "var(--adm-ok-soft)", color: "var(--adm-ok)" }}
      >
        {state.success}
      </p>
    );
  }
  return null;
}
