"use client";

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { createAssignmentAction, type CreateAssignmentState } from "@/lib/actions/assignments";
import { PACKAGE_LABEL } from "@/lib/admin/student-status";
import { QUESTION_TYPES, SKILL_LABELS, type Skill } from "@/lib/question-types";
import type { AssignmentKind, ExamPackage } from "@/lib/generated/prisma/enums";
import type { AssignableClass, QuestionCountsByType } from "@/lib/admin/assignment-queries";
import {
  ASSIGNMENT_KINDS,
  DEFAULT_QUANTITY,
  KIND_META,
  NOTE_MAX,
  QUANTITY_MAX,
  QUANTITY_MIN,
  TITLE_MAX,
} from "@/components/admin/assignments/assignment-meta";
import { QuestionPicker } from "@/components/admin/assignments/question-picker";

const SKILL_ORDER: Skill[] = ["speaking", "writing", "reading", "listening"];

const CHIP =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--adm-line)] bg-[var(--adm-bg)] px-2.5 py-1.5 text-[13px] font-medium " +
  "has-checked:border-[var(--adm-brand)] has-checked:bg-[var(--adm-brand-soft)] has-checked:text-[var(--adm-brand-text)] " +
  "has-disabled:cursor-not-allowed has-disabled:opacity-50";

const LABEL = "text-[12.5px] font-semibold";

type PickMode = "random" | "manual";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-[12.5px] font-medium" style={{ color: "var(--adm-brand-text)" }}>
      {message}
    </p>
  );
}

function Hint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

/** Form "Giao bài mới" (HANDOFF §4.5, bên phải). Lớp/hình thức/dạng bài là state
 * có kiểm soát — đổi lớp chỉ bỏ các dạng không áp dụng cho gói mới, không xoá
 * các ô khác. Gửi form bằng tay (không dùng action của <form>) để React không tự
 * reset các ô khi server trả lỗi; giao thành công chỉ xoá Tên + Ghi chú. */
export function CreateAssignmentForm({
  classes,
  questionCounts,
  teacherGradedTypeIds,
  defaultClassId,
  defaultDueDate,
  minDueDate,
  maxDueDate,
}: {
  classes: AssignableClass[];
  questionCounts: Partial<Record<ExamPackage, QuestionCountsByType>>;
  teacherGradedTypeIds: string[];
  defaultClassId: string | null;
  defaultDueDate: string;
  minDueDate: string;
  maxDueDate: string;
}) {
  const [classId, setClassId] = useState(defaultClassId ?? classes[0]?.id ?? "");
  const [kind, setKind] = useState<AssignmentKind>("TU");
  const [typeIds, setTypeIds] = useState<string[]>([]);
  const [pickMode, setPickMode] = useState<PickMode>("random");
  const [quantity, setQuantity] = useState(String(DEFAULT_QUANTITY));
  /** Tăng sau mỗi lần giao thành công → dựng lại ô Tên/Ghi chú/danh sách chọn tay (về rỗng). */
  const [resetKey, setResetKey] = useState(0);

  const [state, formAction, pending] = useActionState<CreateAssignmentState, FormData>(async (prev, formData) => {
    const result = await createAssignmentAction(prev, formData);
    if (result?.ok) setResetKey((k) => k + 1);
    return result;
  }, null);

  const cls = classes.find((c) => c.id === classId) ?? null;
  const pkg = cls?.examType ?? null;
  const counts: QuestionCountsByType = (pkg && questionCounts[pkg]) || {};
  const availableTypes = pkg ? QUESTION_TYPES.filter((t) => t.availableIn.includes(pkg)) : [];
  const graded = new Set(teacherGradedTypeIds);
  const selectedAvailable = typeIds.reduce((sum, id) => sum + (counts[id]?.total ?? 0), 0);
  const selectedTu = typeIds.reduce((sum, id) => sum + (counts[id]?.tu ?? 0), 0);
  const quantityNum = Number(quantity);
  const errors = state?.ok === false ? state.fieldErrors ?? {} : {};

  const changeClass = (nextId: string) => {
    setClassId(nextId);
    const nextPkg = classes.find((c) => c.id === nextId)?.examType;
    if (!nextPkg) return;
    // Giữ các dạng vẫn áp dụng cho gói của lớp mới.
    setTypeIds((prev) => prev.filter((id) => QUESTION_TYPES.find((t) => t.id === id)?.availableIn.includes(nextPkg)));
  };

  const toggleType = (id: string, checked: boolean) => {
    setTypeIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };

  const describe = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4" aria-label="Giao bài mới">
      {/* Tên bài tập */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="asg-title" className={LABEL}>
          Tên bài tập
        </label>
        <input
          key={`title-${resetKey}`}
          id="asg-title"
          name="title"
          required
          maxLength={TITLE_MAX}
          placeholder="VD: Luyện đề Tủ tuần 7 — Describe Image"
          className="adm-input w-full"
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describe(errors.title && "asg-title-err")}
        />
        <FieldError id="asg-title-err" message={errors.title} />
      </div>

      {/* Lớp */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="asg-class" className={LABEL}>
          Giao cho lớp
        </label>
        <select
          id="asg-class"
          name="classId"
          required
          value={classId}
          onChange={(e) => changeClass(e.target.value)}
          className="adm-input w-full"
          aria-invalid={errors.classId ? true : undefined}
          aria-describedby={describe("asg-class-hint", errors.classId && "asg-class-err")}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </select>
        <Hint id="asg-class-hint">
          {cls ? (
            <>
              {PACKAGE_LABEL[cls.examType] ?? cls.examType} · {cls.studentCount} học viên đang học
              {cls.status === "UPCOMING" ? " · sắp khai giảng" : ""}
              {cls.studentCount === 0 && (
                <span style={{ color: "var(--adm-brand-text)" }}> — lớp chưa có học viên nên chưa giao bài được.</span>
              )}
            </>
          ) : (
            "Chọn lớp để lọc dạng bài theo gói học."
          )}
        </Hint>
        <FieldError id="asg-class-err" message={errors.classId} />
      </div>

      {/* Hình thức */}
      <fieldset className="flex flex-col gap-1.5" aria-describedby={describe(errors.kind && "asg-kind-err")}>
        <legend className={`${LABEL} mb-1.5`}>Hình thức</legend>
        <div className="flex flex-wrap gap-2">
          {ASSIGNMENT_KINDS.map((k) => (
            <label key={k} className={CHIP}>
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="size-3.5 accent-[var(--adm-brand)]"
              />
              {KIND_META[k].label}
            </label>
          ))}
        </div>
        {kind === "TU" && <Hint>Ưu tiên câu thuộc đề Tủ, thiếu thì lấy thêm từ ngân hàng PTE.</Hint>}
        <FieldError id="asg-kind-err" message={errors.kind} />
      </fieldset>

      {/* Dạng bài */}
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={describe("asg-types-hint", errors.questionTypeIds && "asg-types-err")}
      >
        <legend className={`${LABEL} mb-1.5`}>
          Dạng bài{" "}
          {pkg && (
            <span className="font-normal" style={{ color: "var(--adm-ink-3)" }}>
              · {PACKAGE_LABEL[pkg] ?? pkg}
            </span>
          )}
        </legend>
        {!pkg ? (
          <Hint>Chọn lớp trước.</Hint>
        ) : (
          SKILL_ORDER.map((skill) => {
            const types = availableTypes.filter((t) => t.skill === skill);
            if (types.length === 0) return null;
            return (
              <div key={skill} className="flex flex-col gap-1.5" role="group" aria-label={SKILL_LABELS[skill]}>
                <span className="text-[11.5px] font-semibold tracking-[0.05em] uppercase" style={{ color: "var(--adm-ink-3)" }}>
                  {SKILL_LABELS[skill]}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {types.map((t) => {
                    const c = counts[t.id] ?? { total: 0, tu: 0 };
                    const checked = typeIds.includes(t.id);
                    return (
                      <label key={t.id} className={CHIP} title={t.name}>
                        <input
                          type="checkbox"
                          name="questionTypeIds"
                          value={t.id}
                          checked={checked}
                          disabled={!checked && c.total === 0}
                          onChange={(e) => toggleType(t.id, e.target.checked)}
                          className="size-3.5 accent-[var(--adm-brand)]"
                        />
                        <span className="font-semibold">{t.code}</span>
                        <span className="sr-only">
                          {" "}
                          — {t.name}
                          {graded.has(t.id) ? ", giáo viên chấm" : ""}
                        </span>
                        <span className="adm-num text-[12px] font-normal" style={{ color: "var(--adm-ink-3)" }}>
                          {c.total}
                          {kind === "TU" && c.tu > 0 ? ` · ${c.tu} Tủ` : ""}
                          <span className="sr-only"> câu</span>
                        </span>
                        {graded.has(t.id) && (
                          <span className="text-[11px] font-semibold" style={{ color: "var(--adm-plum)" }} aria-hidden="true">
                            GV
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        <Hint id="asg-types-hint">
          Số bên cạnh mã = câu có sẵn trong ngân hàng đề{kind === "TU" ? " (kèm số câu Tủ)" : ""}. <span style={{ color: "var(--adm-plum)" }}>GV</span> = giáo viên chấm theo rubric, bài nộp vào hàng chờ Chấm bài.
        </Hint>
        <FieldError id="asg-types-err" message={errors.questionTypeIds} />
      </fieldset>

      {/* Cách chọn câu */}
      <fieldset className="flex flex-col gap-1.5">
        <legend className={`${LABEL} mb-1.5`}>Chọn câu hỏi</legend>
        <div className="flex flex-wrap gap-2">
          <label className={CHIP}>
            <input
              type="radio"
              name="pickMode"
              value="random"
              checked={pickMode === "random"}
              onChange={() => setPickMode("random")}
              className="size-3.5 accent-[var(--adm-brand)]"
            />
            Ngẫu nhiên theo dạng
          </label>
          <label className={CHIP}>
            <input
              type="radio"
              name="pickMode"
              value="manual"
              checked={pickMode === "manual"}
              onChange={() => setPickMode("manual")}
              className="size-3.5 accent-[var(--adm-brand)]"
            />
            Chọn tay từ ngân hàng đề
          </label>
        </div>
      </fieldset>

      {pickMode === "random" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="asg-quantity" className={LABEL}>
            Số câu
          </label>
          <input
            id="asg-quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            required
            min={QUANTITY_MIN}
            max={QUANTITY_MAX}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="adm-input adm-num w-32"
            aria-invalid={errors.quantity ? true : undefined}
            aria-describedby={describe("asg-quantity-hint", errors.quantity && "asg-quantity-err")}
          />
          <Hint id="asg-quantity-hint">
            {typeIds.length === 0 ? (
              "Chia đều cho các dạng đã chọn, chọn ngẫu nhiên trong từng dạng."
            ) : (
              <>
                Chia đều cho {typeIds.length} dạng · có sẵn <span className="adm-num">{selectedAvailable}</span> câu
                {kind === "TU" ? ` (${selectedTu} câu Tủ)` : ""}.
                {Number.isFinite(quantityNum) && quantityNum > selectedAvailable && selectedAvailable > 0 && (
                  <span style={{ color: "var(--adm-warn)" }}> Không đủ câu — bài sẽ gồm {selectedAvailable} câu.</span>
                )}
                {Number.isInteger(quantityNum) && quantityNum >= QUANTITY_MIN && quantityNum < typeIds.length && (
                  <span style={{ color: "var(--adm-warn)" }}>
                    {" "}
                    Số câu ít hơn số dạng — bài chỉ gồm tối đa {quantityNum} dạng (ưu tiên theo thứ tự đề thi).
                  </span>
                )}
              </>
            )}
          </Hint>
          <FieldError id="asg-quantity-err" message={errors.quantity} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <QuestionPicker
            key={`picker-${resetKey}`}
            classId={classId}
            typeIds={typeIds}
            kind={kind}
            invalid={Boolean(errors.questionIds)}
            describedBy={errors.questionIds ? "asg-picker-err" : undefined}
          />
          <FieldError id="asg-picker-err" message={errors.questionIds} />
        </div>
      )}

      {/* Hạn nộp */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="asg-due" className={LABEL}>
          Hạn nộp
        </label>
        <input
          id="asg-due"
          name="dueAt"
          type="date"
          defaultValue={defaultDueDate}
          min={minDueDate}
          max={maxDueDate}
          className="adm-input adm-num w-48"
          aria-invalid={errors.dueAt ? true : undefined}
          aria-describedby={describe("asg-due-hint", errors.dueAt && "asg-due-err")}
        />
        <Hint id="asg-due-hint">Tính đến 23:59 ngày đã chọn (giờ Việt Nam). Xoá ngày nếu không đặt hạn.</Hint>
        <FieldError id="asg-due-err" message={errors.dueAt} />
      </div>

      {/* Thông báo */}
      <div className="flex flex-col gap-1">
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13.5px] font-medium">
          <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[var(--adm-brand)]" aria-describedby="asg-notify-hint" />
          Gửi thông báo cho học viên
        </label>
        <Hint id="asg-notify-hint">Lựa chọn được lưu lại; thông báo trong app / Zalo sẽ gửi khi tính năng thông báo ra mắt.</Hint>
      </div>

      {/* Ghi chú */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="asg-note" className={LABEL}>
          Ghi chú <span className="font-normal" style={{ color: "var(--adm-ink-3)" }}>(không bắt buộc)</span>
        </label>
        <textarea
          key={`note-${resetKey}`}
          id="asg-note"
          name="note"
          rows={3}
          maxLength={NOTE_MAX}
          placeholder="VD: Làm trước buổi học thứ 5, chú ý phát âm đuôi -ed."
          className="adm-input w-full resize-y"
          aria-invalid={errors.note ? true : undefined}
          aria-describedby={describe(errors.note && "asg-note-err")}
        />
        <FieldError id="asg-note-err" message={errors.note} />
      </div>

      {state?.ok === false && state.error && (
        <p
          role="alert"
          className="rounded-lg px-3 py-2 text-[13px] font-medium"
          style={{ background: "var(--adm-brand-soft)", color: "var(--adm-brand-text)" }}
        >
          {state.error}
        </p>
      )}
      {state?.ok && (
        <div role="status" className="rounded-lg px-3 py-2 text-[13px] font-medium" style={{ background: "var(--adm-ok-soft)", color: "var(--adm-ok)" }}>
          {state.message}{" "}
          {state.assignmentId && (
            <Link href={`/admin/assignments/${state.assignmentId}`} className="font-semibold whitespace-nowrap underline">
              Xem bài tập →
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button type="submit" className="adm-btn adm-btn-pri" disabled={pending} aria-disabled={pending}>
          {pending ? "Đang giao…" : "Giao bài"}
        </button>
      </div>
    </form>
  );
}
