"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { setTeacherSpecialtyAction } from "@/lib/actions/teachers";

const SPECIALTY_MAX = 100;

/** Ô "Chuyên môn" trong bảng giáo viên: hiện chữ + nút "Sửa"; bấm Sửa → ô nhập
 * ngay tại chỗ (Lưu / Huỷ, Esc để huỷ). Server kiểm tra lại quyền và độ dài. */
export function TeacherSpecialtyCell({
  teacherId,
  teacherName,
  specialty,
  canEdit,
}: {
  teacherId: string;
  teacherName: string;
  specialty: string | null;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  // Đóng ô nhập (lưu xong / huỷ) → trả focus về nút "Sửa", không rơi về <body>.
  const restoreFocus = useRef(false);
  const id = useId();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      editRef.current?.focus();
    }
  }, [editing]);

  const close = () => {
    restoreFocus.current = true;
    setError(null);
    setEditing(false);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const res = await setTeacherSpecialtyAction(formData);
        if (res?.error) {
          setError(res.error);
          inputRef.current?.focus();
        } else {
          close();
        }
      } catch {
        setError("Không lưu được. Vui lòng thử lại.");
      }
    });
  };

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        {specialty ? (
          <span className="min-w-0 break-words">{specialty}</span>
        ) : (
          <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Chưa nhập
          </span>
        )}
        {canEdit && (
          <button
            ref={editRef}
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm shrink-0"
            onClick={() => setEditing(true)}
          >
            Sửa<span className="sr-only"> chuyên môn của {teacherName}</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-w-[220px] flex-col gap-1.5"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isPending) {
          e.preventDefault();
          close();
        }
      }}
    >
      <input type="hidden" name="teacherId" value={teacherId} />
      <label htmlFor={`${id}-specialty`} className="sr-only">
        Chuyên môn của {teacherName}
      </label>
      <input
        ref={inputRef}
        id={`${id}-specialty`}
        name="specialty"
        defaultValue={specialty ?? ""}
        maxLength={SPECIALTY_MAX}
        placeholder="VD: Speaking & Writing"
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="adm-input w-full"
        // readOnly thay vì disabled: vẫn focus lại được khi server báo lỗi.
        readOnly={isPending}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="submit" className="adm-btn adm-btn-sm" disabled={isPending} aria-disabled={isPending}>
          {isPending ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={close} disabled={isPending}>
          Huỷ
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[12.5px] font-semibold" style={{ color: "var(--adm-brand-text)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
