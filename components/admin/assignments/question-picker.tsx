"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { listAssignableQuestionsAction, type AssignableQuestionsResult } from "@/lib/actions/assignments";
import { QUANTITY_MAX } from "@/components/admin/assignments/assignment-meta";

/** Chọn tay câu hỏi từ ngân hàng đề cho bài tập (HANDOFF §4.5 "Bản thật").
 * Các ô tick mang name="questionIds" nên gửi thẳng cùng form; server kiểm tra lại
 * từng câu (đúng dạng, đúng gói của lớp, chưa lưu trữ). */
export function QuestionPicker({
  classId,
  typeIds,
  kind,
  invalid,
  describedBy,
}: {
  classId: string;
  typeIds: string[];
  kind: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const [result, setResult] = useState<AssignableQuestionsResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, startLoading] = useTransition();
  const typesKey = typeIds.join(",");

  useEffect(() => {
    if (!classId || !typesKey) return;
    let cancelled = false;
    startLoading(async () => {
      let res: AssignableQuestionsResult;
      try {
        res = await listAssignableQuestionsAction(classId, typesKey.split(","), kind);
      } catch {
        res = { ok: false, error: "Không tải được danh sách câu. Thử lại sau." };
      }
      if (cancelled) return;
      setResult(res);
      // Giữ lại các câu đã tick nếu vẫn còn trong danh sách mới.
      if (res.ok) {
        const available = new Set(res.questions.map((q) => q.id));
        setSelected((prev) => prev.filter((id) => available.has(id)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [classId, typesKey, kind]);

  // Chỉ hiện câu thuộc các dạng đang chọn (trong lúc danh sách mới còn đang tải).
  const questions = useMemo(
    () => (result?.ok ? result.questions.filter((q) => typesKey.split(",").includes(q.questionTypeId)) : []),
    [result, typesKey]
  );
  const needle = query.trim().toLocaleLowerCase("vi");
  const visibleIds = useMemo(
    () =>
      new Set(
        questions
          .filter(
            (q) =>
              !needle ||
              q.code.toLocaleLowerCase("vi").includes(needle) ||
              q.typeCode.toLocaleLowerCase("vi").includes(needle) ||
              q.excerpt.toLocaleLowerCase("vi").includes(needle)
          )
          .map((q) => q.id)
      ),
    [questions, needle]
  );
  const shownIds = new Set(questions.map((q) => q.id));
  // Câu đã tick nhưng không còn hiện (đổi dạng bài) thì không được gửi đi → không đếm.
  const effective = selected.filter((id) => shownIds.has(id));
  const selectedSet = new Set(effective);
  const full = effective.length >= QUANTITY_MAX;

  if (!classId || typeIds.length === 0) {
    return (
      <p className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
        Chọn lớp và dạng bài để xem danh sách câu.
      </p>
    );
  }

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const kept = prev.filter((x) => shownIds.has(x) && x !== id);
      return checked && kept.length < QUANTITY_MAX ? [...kept, id] : kept;
    });
  };

  const selectVisible = () => {
    setSelected((prev) => {
      const next = prev.filter((x) => shownIds.has(x));
      for (const q of questions) {
        if (next.length >= QUANTITY_MAX) break;
        if (visibleIds.has(q.id) && !next.includes(q.id)) next.push(q.id);
      }
      return next;
    });
  };

  const truncated = result?.ok
    ? Object.entries(result.totals).filter(([, total]) => total > result.limitPerType).length > 0
    : false;

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-2.5"
      style={{ borderColor: invalid ? "var(--adm-brand)" : "var(--adm-line)", background: "var(--adm-surface)" }}
      role="group"
      aria-label="Chọn tay câu hỏi"
      aria-describedby={describedBy}
      aria-busy={loading}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="picker-search" className="sr-only">
          Lọc câu theo mã hoặc nội dung
        </label>
        <input
          id="picker-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter trong ô lọc không gửi form giao bài.
            if (e.key === "Enter") e.preventDefault();
          }}
          placeholder="Lọc theo mã câu / nội dung"
          className="adm-input min-w-0 flex-1 py-1.5 text-[13px]"
        />
        <button type="button" className="adm-btn adm-btn-sm" onClick={selectVisible} disabled={questions.length === 0 || full}>
          Chọn tất cả{needle ? " (đang lọc)" : ""}
        </button>
        <button type="button" className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => setSelected([])} disabled={effective.length === 0}>
          Bỏ chọn
        </button>
      </div>

      <p className="text-[12.5px]" role="status" aria-live="polite" style={{ color: "var(--adm-ink-2)" }}>
        {!result ? (
          "Đang tải danh sách câu…"
        ) : (
          <>
            Đã chọn <span className="adm-num font-semibold">{effective.length}</span>
            {full ? ` (tối đa ${QUANTITY_MAX} câu)` : ""} · {questions.length} câu khả dụng
            {loading ? " · đang cập nhật…" : ""}
          </>
        )}
      </p>

      {result && !result.ok && (
        <p className="text-[12.5px]" role="alert" style={{ color: "var(--adm-brand-text)" }}>
          {result.error}
        </p>
      )}

      {result?.ok && questions.length === 0 && (
        <p className="py-3 text-center text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Ngân hàng đề chưa có câu nào cho các dạng đã chọn.
        </p>
      )}

      {questions.length > 0 && (
        <ul className="max-h-[320px] overflow-y-auto rounded-md border" style={{ borderColor: "var(--adm-line)", background: "var(--adm-bg)" }} aria-label="Câu hỏi trong ngân hàng đề">
          {questions.map((q) => {
            const checked = selectedSet.has(q.id);
            return (
              <li key={q.id} hidden={!visibleIds.has(q.id)} className="border-b last:border-b-0" style={{ borderColor: "var(--adm-line)" }}>
                <label className="flex cursor-pointer items-start gap-2.5 px-2.5 py-2 hover:bg-[var(--adm-surface)]">
                  <input
                    type="checkbox"
                    name="questionIds"
                    value={q.id}
                    checked={checked}
                    disabled={!checked && full}
                    onChange={(e) => toggle(q.id, e.target.checked)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--adm-brand)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="adm-num text-[12.5px] font-semibold">{q.code}</span>
                      <span className="adm-tag">{q.typeCode}</span>
                      {q.isTu && <span className="adm-tag adm-tag-ac">Tủ</span>}
                    </span>
                    <span className="font-passage mt-0.5 block text-[13px] leading-snug" style={{ color: "var(--adm-ink-2)" }}>
                      {q.excerpt}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {truncated && (
        <p className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Dạng có nhiều câu chỉ hiện {result?.ok ? result.limitPerType : ""} câu đầu theo mã ({kind === "TU" ? "câu Tủ trước" : "câu PTE trước"}). Cần câu khác thì dùng chế độ ngẫu nhiên.
        </p>
      )}
    </div>
  );
}
