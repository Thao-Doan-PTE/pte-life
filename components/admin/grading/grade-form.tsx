"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveGradeAction, type GradeFormState } from "@/lib/actions/grading";
import type { GradeCriterionInput } from "@/lib/admin/grading-queries";
import { setFlash } from "@/components/admin/grading/flash";

/** Form điểm theo rubric của dạng bài (HANDOFF §4.6): mỗi tiêu chí 1 ô số 0..max,
 * tổng tự cộng ("–" cho tới khi nhập đủ), ô nhận xét, nút "Lưu điểm & trả bài".
 * Gợi ý AI chỉ hiện dạng chữ — giáo viên phải tự nhập đủ mọi tiêu chí.
 * Lưu xong tự chuyển sang bài chờ chấm kế tiếp (router.replace ?attempt=…); thông
 * báo "đã lưu" đi kèm qua flash phía client (không đặt cờ trên URL để tải lại /
 * Back không hiện lại). Gửi kèm thời điểm chấm của bản điểm đang xem để server
 * phát hiện hai người chấm cùng lúc.
 * Bài đã chấm: hiện điểm đã lưu ở chế độ chỉ xem + nút "Sửa điểm". Server kiểm
 * tra lại toàn bộ (quyền, phạm vi lớp, rubric, khoảng điểm). */

export interface SavedGradeProps {
  criteria: { key: string; label: string; max: number; score: number }[];
  total: number;
  maxTotal: number;
  comment: string | null;
  gradedAtText: string;
  /** gradedAt dạng ISO — khoá lạc quan khi sửa điểm. */
  gradedAtIso: string;
  gradedByName: string;
  rubricVersion: number;
}

const COMMENT_MAX = 2000;
const RANGE_ERROR = "Nhập đủ điểm từng tiêu chí, trong khoảng cho phép.";
const GENERIC_ERROR = "Không lưu được điểm. Vui lòng thử lại.";

function isValidScore(value: string | undefined, max: number): boolean {
  if (value === undefined || !/^\d{1,3}$/.test(value.trim())) return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= max;
}

function emptyValues(criteria: GradeCriterionInput[]): Record<string, string> {
  return Object.fromEntries(criteria.map((c) => [c.key, ""]));
}

/** Điền lại điểm đã lưu khi sửa điểm (chỉ tiêu chí còn trong rubric hiện tại và còn trong khoảng). */
function savedValues(criteria: GradeCriterionInput[], saved: SavedGradeProps | null): Record<string, string> {
  const byKey = new Map((saved?.criteria ?? []).map((c) => [c.key, c.score]));
  return Object.fromEntries(
    criteria.map((c) => {
      const s = byKey.get(c.key);
      return [c.key, s !== undefined && s >= 0 && s <= c.max ? String(s) : ""];
    })
  );
}

export function GradeForm({
  attemptId,
  criteria,
  rubricVersion,
  rubricLabel,
  rubricSettingsHref,
  saved,
  filters,
}: {
  attemptId: string;
  /** Rubric đang dùng của dạng bài (rỗng = chưa có rubric → chỉ xem được điểm đã lưu). */
  criteria: GradeCriterionInput[];
  rubricVersion: number;
  rubricLabel: string;
  /** Link cài đặt rubric — chỉ truyền khi người dùng có quyền sửa rubric. */
  rubricSettingsHref?: string;
  saved: SavedGradeProps | null;
  filters: { assignmentId: string | null; classId: string | null };
}) {
  const id = useId();
  const router = useRouter();
  const [editing, setEditing] = useState(saved === null);
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(criteria));
  const [comment, setComment] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [showInvalid, setShowInvalid] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const focusOnEdit = useRef(false);

  const hrefFor = (nextId: string) => {
    const p = new URLSearchParams();
    if (filters.assignmentId) p.set("assignment", filters.assignmentId);
    if (filters.classId) p.set("class", filters.classId);
    p.set("attempt", nextId);
    return `/admin/grading?${p.toString()}#bai-lam`;
  };

  const [state, dispatch, pending] = useActionState<GradeFormState, FormData>(async (prev, formData) => {
    let result: GradeFormState;
    try {
      result = await saveGradeAction(prev, formData);
    } catch {
      return { ok: false, error: GENERIC_ERROR };
    }
    if (result?.ok) {
      if (result.nextAttemptId) {
        setFlash(`grade:${result.nextAttemptId}`, `${result.message ?? "Đã lưu điểm."} Đây là bài kế tiếp trong hàng chờ.`);
        router.replace(hrefFor(result.nextAttemptId));
      } else setEditing(false);
    }
    return result;
  }, null);

  useEffect(() => {
    if (editing && focusOnEdit.current) {
      focusOnEdit.current = false;
      firstInputRef.current?.focus();
    }
  }, [editing]);

  const inputId = (key: string) => `${id}-score-${key}`;
  const maxTotal = criteria.reduce((s, c) => s + c.max, 0);
  const allValid = criteria.length > 0 && criteria.every((c) => isValidScore(values[c.key], c.max));
  const total = allValid ? criteria.reduce((s, c) => s + Number(values[c.key]), 0) : null;
  const serverFieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const errorText = clientError ?? (state && !state.ok ? state.error : null);

  function startEdit() {
    setValues(savedValues(criteria, saved));
    setComment(saved?.comment ?? "");
    setClientError(null);
    setShowInvalid(false);
    focusOnEdit.current = true;
    setEditing(true);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Gửi qua onSubmit (không dùng <form action>) để React không reset form khi server trả lỗi.
    e.preventDefault();
    const invalid = criteria.filter((c) => !isValidScore(values[c.key], c.max));
    if (invalid.length > 0) {
      setShowInvalid(true);
      setClientError(RANGE_ERROR);
      document.getElementById(inputId(invalid[0].key))?.focus();
      return;
    }
    if (comment.trim().length > COMMENT_MAX) {
      setClientError(`Nhận xét tối đa ${COMMENT_MAX} ký tự.`);
      return;
    }
    setClientError(null);
    setShowInvalid(false);
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  }

  const successNotice =
    state?.ok && state.message ? (
      <p
        role="status"
        className="rounded-lg px-3 py-2 text-[13px] font-medium"
        style={{ background: "var(--adm-ok-soft)", color: "var(--adm-ok)" }}
      >
        {state.message}
      </p>
    ) : null;

  // ===== Chế độ chỉ xem (bài đã chấm) =====
  if (!editing && saved) {
    const rubricChanged = criteria.length > 0 && saved.rubricVersion !== rubricVersion;
    return (
      <div className="flex flex-col gap-3">
        {successNotice}
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-2 text-[13.5px]">
          {saved.criteria.map((c) => (
            <div key={c.key} className="contents">
              <dt>{c.label}</dt>
              <dd className="adm-num text-right font-semibold">
                {c.score} <span style={{ color: "var(--adm-ink-3)", fontWeight: 400 }}>/ {c.max}</span>
              </dd>
            </div>
          ))}
        </dl>
        <TotalBox total={saved.total} maxTotal={saved.maxTotal} />
        <div>
          <p className="mb-1 text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Nhận xét cho học viên
          </p>
          {saved.comment ? (
            <p
              className="rounded-[10px] border px-3 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap"
              style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
            >
              {saved.comment}
            </p>
          ) : (
            <p className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
              Không có nhận xét.
            </p>
          )}
        </div>
        <p className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Chấm bởi {saved.gradedByName} lúc <span className="adm-num">{saved.gradedAtText}</span>
          {saved.rubricVersion === 0 ? " · rubric mặc định" : ` · rubric phiên bản ${saved.rubricVersion}`}
        </p>
        {rubricChanged && (
          <p className="text-[12.5px]" style={{ color: "var(--adm-warn)" }}>
            Rubric của dạng bài đã đổi sang {rubricVersion === 0 ? "bản mặc định" : `phiên bản ${rubricVersion}`} — sửa điểm sẽ chấm theo bản
            mới.
          </p>
        )}
        {criteria.length > 0 && (
          <div>
            <button type="button" className="adm-btn" onClick={startEdit}>
              Sửa điểm
            </button>
          </div>
        )}
      </div>
    );
  }

  // ===== Chế độ nhập điểm =====
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3.5" aria-labelledby={`${id}-title`}>
      <input type="hidden" name="attemptId" value={attemptId} />
      <input type="hidden" name="rubricVersion" value={rubricVersion} />
      <input type="hidden" name="expectedGradedAt" value={saved?.gradedAtIso ?? ""} />
      <input type="hidden" name="f_assignment" value={filters.assignmentId ?? ""} />
      <input type="hidden" name="f_class" value={filters.classId ?? ""} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`${id}-title`} className="text-[12px] font-semibold tracking-[0.07em] uppercase" style={{ color: "var(--adm-ink-3)" }}>
          {saved ? "Sửa điểm" : "Chấm điểm"}
        </h3>
        <span className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {rubricLabel}
          {rubricSettingsHref && (
            <>
              {" · "}
              <Link href={rubricSettingsHref} className="underline underline-offset-2">
                Sửa rubric
              </Link>
            </>
          )}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2.5">
        {criteria.map((c, i) => {
          const fieldError = serverFieldErrors[`score_${c.key}`];
          // Lỗi (kể cả lỗi server trả về) chỉ còn hiện khi giá trị vẫn sai — sửa đúng là hết đánh dấu.
          const invalid = (showInvalid || !!fieldError) && !isValidScore(values[c.key], c.max);
          const hintId = `${inputId(c.key)}-hint`;
          return (
            <div key={c.key} className="contents">
              <div className="min-w-0">
                <label htmlFor={inputId(c.key)} className="block text-[13.5px] font-medium">
                  {c.label}
                </label>
                <span id={hintId} className="block text-[12px]" style={{ color: invalid ? "var(--adm-brand-text)" : "var(--adm-ink-3)" }}>
                  {invalid && fieldError ? fieldError : c.aiHint !== null ? `AI gợi ý: ${c.aiHint}` : "AI: không có gợi ý"}
                </span>
              </div>
              <input
                ref={i === 0 ? firstInputRef : undefined}
                id={inputId(c.key)}
                name={`score_${c.key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={c.max}
                step={1}
                required
                value={values[c.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [c.key]: e.target.value }))}
                aria-describedby={hintId}
                aria-invalid={invalid || undefined}
                disabled={pending}
                className="adm-input adm-num w-[70px] text-center"
                style={invalid ? { borderColor: "var(--adm-brand)" } : undefined}
              />
              <span className="adm-num text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                / {c.max}
              </span>
            </div>
          );
        })}
      </div>

      <TotalBox total={total} maxTotal={maxTotal} live />

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-comment`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
          Nhận xét cho học viên
        </label>
        <textarea
          id={`${id}-comment`}
          name="comment"
          rows={3}
          maxLength={COMMENT_MAX}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="VD: Bố cục rõ, cần thêm ví dụ cụ thể ở đoạn thân bài 2."
          disabled={pending}
          aria-describedby={`${id}-comment-count`}
          aria-invalid={(!!serverFieldErrors.comment && comment.trim().length > COMMENT_MAX) || undefined}
          className="adm-input w-full resize-y leading-relaxed"
        />
        <span id={`${id}-comment-count`} className="adm-num self-end text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {comment.length}/{COMMENT_MAX}
        </span>
      </div>

      {errorText && (
        <p
          role="alert"
          className="rounded-lg px-3 py-2 text-[13px] font-medium"
          style={{ background: "var(--adm-brand-soft)", color: "var(--adm-brand-text)" }}
        >
          {errorText}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="adm-btn adm-btn-pri" disabled={pending} aria-disabled={pending}>
          {pending ? "Đang lưu…" : "Lưu điểm & trả bài"}
        </button>
        {saved && (
          <button
            type="button"
            className="adm-btn adm-btn-ghost"
            disabled={pending}
            onClick={() => {
              setClientError(null);
              setEditing(false);
            }}
          >
            Huỷ
          </button>
        )}
      </div>
    </form>
  );
}

function TotalBox({ total, maxTotal, live = false }: { total: number | null; maxTotal: number; live?: boolean }) {
  return (
    <div
      className="flex items-baseline gap-2.5 rounded-[10px] px-3.5 py-3"
      style={{ background: "var(--adm-surface-2)" }}
      aria-live={live ? "polite" : undefined}
      aria-atomic={live ? "true" : undefined}
    >
      <span style={{ color: "var(--adm-ink-2)" }}>Tổng</span>
      <span className="adm-num text-[26px] leading-none font-semibold">{total ?? "–"}</span>
      <span className="adm-num" style={{ color: "var(--adm-ink-3)" }}>
        / {maxTotal}
      </span>
    </div>
  );
}
