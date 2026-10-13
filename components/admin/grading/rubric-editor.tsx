"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { saveRubricAction, type RubricFormState } from "@/lib/actions/grading";
import { setFlash, useFlashMessage } from "@/components/admin/grading/flash";

/** Thẻ rubric 1 dạng bài trên trang Cài đặt rubric: xem tiêu chí (tên, điểm tối
 * đa), bấm "Sửa rubric" để đổi tên/điểm, thêm/bớt tiêu chí, ghi chú. Mỗi lần lưu
 * tạo PHIÊN BẢN MỚI ở server (bản cũ giữ nguyên để bài đã chấm vẫn khớp bản chụp).
 * Form "thêm rubric" (isNew) biến mất sau khi lưu (dạng bài chuyển thành thẻ thường)
 * → chuyển thông báo "đã lưu" sang thẻ đó qua flash phía client và bỏ ?add trên URL. */

interface Criterion {
  key: string;
  label: string;
  max: number;
}

interface Row {
  uid: string;
  /** Rỗng = tiêu chí mới, server tự tạo mã từ tên. */
  key: string;
  label: string;
  max: string;
}

const MAX_CRITERIA = 20;
const NOTE_MAX = 300;
const GENERIC_ERROR = "Không lưu được rubric. Vui lòng thử lại.";

function toRows(criteria: Criterion[]): Row[] {
  if (criteria.length === 0) return [{ uid: "new-0", key: "", label: "", max: "" }];
  return criteria.map((c) => ({ uid: `k-${c.key}`, key: c.key, label: c.label, max: String(c.max) }));
}

function validMax(v: string): boolean {
  if (!/^\d{1,2}$/.test(v.trim())) return false;
  const n = Number(v);
  return n >= 1 && n <= 20;
}

export function RubricEditor({
  questionTypeId,
  code,
  name,
  skillLabel,
  criteria,
  version,
  note,
  isDefault,
  metaText,
  isNew = false,
}: {
  questionTypeId: string;
  code: string;
  name: string;
  skillLabel: string;
  criteria: Criterion[];
  /** 0 = bản mặc định (chưa lưu DB) hoặc dạng bài chưa có rubric. */
  version: number;
  note: string | null;
  isDefault: boolean;
  metaText: string;
  /** Thêm rubric cho dạng bài chưa có — mở sẵn form. */
  isNew?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [editing, setEditing] = useState(isNew);
  const [flashDismissed, setFlashDismissed] = useState(false);
  const flash = useFlashMessage(isNew ? null : `rubric:${questionTypeId}`);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [rows, setRows] = useState<Row[]>(() => toRows(isNew ? [] : criteria));
  const [noteValue, setNoteValue] = useState("");
  const [seq, setSeq] = useState(1);
  const [clientError, setClientError] = useState<string | null>(null);

  const [state, dispatch, pending] = useActionState<RubricFormState, FormData>(async (prev, formData) => {
    try {
      const result = await saveRubricAction(prev, formData);
      if (result?.ok && isNew) {
        setFlash(`rubric:${questionTypeId}`, result.message ?? "Đã lưu rubric.");
        router.replace("/admin/grading/rubrics", { scroll: false });
      } else if (result?.ok) setEditing(false);
      return result;
    } catch {
      return { ok: false, error: GENERIC_ERROR };
    }
  }, null);

  const totalMax = criteria.reduce((s, c) => s + c.max, 0);
  const editTotal = rows.reduce((s, r) => s + (validMax(r.max) ? Number(r.max) : 0), 0);
  const errorText = clientError ?? (state && !state.ok ? state.error : null);
  const statusText = state?.ok && state.message ? state.message : flashDismissed ? null : flash;

  // Thẻ vừa được tạo từ form "thêm rubric": đưa tới thẻ và đọc thông báo.
  useEffect(() => {
    if (flash) statusRef.current?.focus();
  }, [flash]);

  function startEdit() {
    setRows(toRows(criteria));
    setNoteValue(isDefault ? "" : (note ?? ""));
    setClientError(null);
    setFlashDismissed(true);
    setEditing(true);
  }

  function addRow() {
    setRows((r) => (r.length >= MAX_CRITERIA ? r : [...r, { uid: `new-${seq}`, key: "", label: "", max: "" }]));
    setSeq((s) => s + 1);
  }

  function updateRow(uid: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Gửi qua onSubmit để React không reset form khi server trả lỗi.
    e.preventDefault();
    if (rows.length === 0) return setClientError("Cần ít nhất 1 tiêu chí.");
    const badLabel = rows.findIndex((r) => !r.label.trim());
    if (badLabel >= 0) return setClientError(`Nhập tên cho tiêu chí ${badLabel + 1}.`);
    const badMax = rows.findIndex((r) => !validMax(r.max));
    if (badMax >= 0) return setClientError(`Điểm tối đa của tiêu chí ${badMax + 1} phải là số nguyên từ 1 đến 20.`);
    setClientError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <section className="adm-panel min-w-0" aria-labelledby={`${id}-title`}>
      <div className="adm-panel-head">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="adm-tag">{code}</span>
          <h2 id={`${id}-title`} className="min-w-0">
            {name}
          </h2>
          <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            {skillLabel}
          </span>
        </div>
        {!editing && !isNew && (
          <button type="button" className="adm-btn adm-btn-sm" onClick={startEdit}>
            Sửa rubric
            <span className="sr-only"> {code}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 p-4">
        <p className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {metaText}
        </p>
        {!editing && note && (
          <p
            className="rounded-lg px-3 py-2 text-[12.5px]"
            style={
              isDefault
                ? { background: "var(--adm-warn-soft)", color: "var(--adm-warn)" }
                : { background: "var(--adm-surface)", color: "var(--adm-ink-2)" }
            }
          >
            {note}
          </p>
        )}

        {!editing ? (
          <>
            {statusText && (
              <p
                ref={statusRef}
                role="status"
                tabIndex={-1}
                className="rounded-lg px-3 py-2 text-[13px] font-medium outline-none"
                style={{ background: "var(--adm-ok-soft)", color: "var(--adm-ok)" }}
              >
                {statusText}
              </p>
            )}
            <div className="adm-tw">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Tiêu chí</th>
                    <th scope="col" className="text-right">
                      Tối đa
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c.key}>
                      <td>{c.label}</td>
                      <td className="adm-num text-right font-semibold">{c.max}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="font-semibold">Tổng</td>
                    <td className="adm-num text-right font-semibold">{totalMax}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
            <input type="hidden" name="questionTypeId" value={questionTypeId} />
            <input type="hidden" name="baseVersion" value={version} />

            <fieldset className="flex flex-col gap-2" disabled={pending}>
              <legend className="mb-1 text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
                Tiêu chí và điểm tối đa (1–20)
              </legend>
              {rows.map((r, i) => (
                <div key={r.uid} className="grid grid-cols-[minmax(0,1fr)_72px_auto] items-start gap-2">
                  <input type="hidden" name="c_key" value={r.key} />
                  <div className="min-w-0">
                    <input
                      name="c_label"
                      className="adm-input w-full"
                      value={r.label}
                      maxLength={80}
                      onChange={(e) => updateRow(r.uid, { label: e.target.value })}
                      aria-label={`Tên tiêu chí ${i + 1}`}
                      placeholder="VD: Oral fluency"
                    />
                    <span className="mt-0.5 block text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
                      {r.key ? `Mã: ${r.key}` : "Mã tự tạo từ tên khi lưu"}
                    </span>
                  </div>
                  <input
                    name="c_max"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={20}
                    step={1}
                    className="adm-input adm-num w-full text-center"
                    value={r.max}
                    onChange={(e) => updateRow(r.uid, { max: e.target.value })}
                    aria-label={`Điểm tối đa của tiêu chí ${i + 1}`}
                  />
                  <button
                    type="button"
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    onClick={() => setRows((rs) => rs.filter((x) => x.uid !== r.uid))}
                    disabled={rows.length <= 1}
                    aria-label={`Xoá tiêu chí ${i + 1}${r.label ? ` (${r.label})` : ""}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" className="adm-btn adm-btn-sm" onClick={addRow} disabled={rows.length >= MAX_CRITERIA}>
                  <Plus className="size-4" aria-hidden="true" />
                  Thêm tiêu chí
                </button>
                <span className="adm-num text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
                  Tổng điểm tối đa: <b>{editTotal}</b>
                </span>
              </div>
            </fieldset>

            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-note`} className="text-[12px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
                Ghi chú phiên bản
              </label>
              <textarea
                id={`${id}-note`}
                name="note"
                rows={2}
                maxLength={NOTE_MAX}
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                disabled={pending}
                placeholder="VD: Đã đối chiếu Score Guide Pearson 10/2026"
                className="adm-input w-full resize-y"
              />
            </div>

            <p className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
              Lưu sẽ tạo phiên bản mới; bài đã chấm giữ nguyên điểm theo bản cũ.
            </p>

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
                {pending ? "Đang lưu…" : "Lưu phiên bản mới"}
              </button>
              {isNew ? (
                <Link href="/admin/grading/rubrics" className="adm-btn adm-btn-ghost">
                  Huỷ
                </Link>
              ) : (
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
        )}
      </div>
    </section>
  );
}
