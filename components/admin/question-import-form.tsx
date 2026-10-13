"use client";

import { useActionState, useId, useState } from "react";
import { importQuestionsAction, type ImportResult } from "@/lib/actions/admin-questions";

async function fileToCsvText(file: File): Promise<string> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  if (!isExcel) {
    return file.text();
  }
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_csv(sheet);
}

export function QuestionImportForm({ questionTypeId }: { questionTypeId: string }) {
  const [state, formAction, isPending] = useActionState<ImportResult | null, FormData>(
    importQuestionsAction,
    null
  );
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [readError, setReadError] = useState<string | null>(null);
  const [bank, setBank] = useState<"PTE" | "TU">("PTE");
  const bankId = useId();
  const fileId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="questionTypeId" value={questionTypeId} />
      <input type="hidden" name="csvContent" value={csvText} />
      <input type="hidden" name="bank" value={bank} />

      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="flex flex-col gap-1">
          <label htmlFor={bankId} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            Ngân hàng
          </label>
          <select
            id={bankId}
            value={bank}
            onChange={(e) => setBank(e.target.value as "PTE" | "TU")}
            className="adm-input"
          >
            <option value="PTE">Luyện đề PTE</option>
            <option value="TU">Luyện đề Tủ</option>
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={fileId} className="text-[12.5px] font-semibold" style={{ color: "var(--adm-ink-2)" }}>
            File câu hỏi (.csv, .xlsx, .xls)
          </label>
          <input
            id={fileId}
            type="file"
            key={questionTypeId}
            accept=".csv,.xlsx,.xls,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) {
                setCsvText("");
                setFileName("");
                setReadError(null);
                return;
              }
              setReadError(null);
              try {
                setCsvText(await fileToCsvText(f));
                setFileName(f.name);
              } catch {
                setCsvText("");
                setFileName("");
                setReadError(
                  "Không đọc được file này. Hãy dùng file .csv hoặc .xlsx/.xls chưa bị lỗi."
                );
              }
            }}
            className="adm-input w-full min-w-0 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[var(--adm-surface-2)] file:px-3 file:py-1 file:text-[12.5px] file:font-semibold file:text-[var(--adm-ink)]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="adm-btn adm-btn-pri" disabled={isPending || !csvText}>
          {isPending ? "Đang import..." : "Import câu hỏi"}
        </button>
        {fileName ? (
          <span className="min-w-0 truncate text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Đã chọn: {fileName} · vào {bank === "TU" ? "Luyện đề Tủ" : "Luyện đề PTE"}
          </span>
        ) : (
          <span className="text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Câu trùng mã (code) sẽ được cập nhật, mã mới được thêm vào.
          </span>
        )}
      </div>
      {readError && (
        <p role="alert" className="text-[12.5px]" style={{ color: "var(--adm-brand-text)" }}>
          {readError}
        </p>
      )}

      {/* Vùng thông báo luôn nằm trong cây trợ năng (không ẩn khi rỗng) để trình đọc
          màn hình đọc được cả kết quả import đầu tiên; bản thân vùng không có khoảng
          cách — form gap-3 cộng thêm 1 khoảng nhỏ khi rỗng, bù bằng -mt-3. */}
      <div role="status" aria-live="polite" className="-mt-3 text-[13.5px]">
        {state && (state.created > 0 || state.updated > 0) && (
          <p
            className="mt-3 rounded-lg px-3 py-2 font-semibold"
            style={{ background: "var(--adm-ok-soft)", color: "var(--adm-ok)" }}
          >
            Đã thêm mới {state.created} câu, cập nhật {state.updated} câu.
          </p>
        )}
        {state && state.errors.length > 0 && (
          <div
            className="mt-3 rounded-lg border p-3"
            style={{ background: "var(--adm-brand-soft)", borderColor: "var(--adm-brand)", color: "var(--adm-brand-text)" }}
          >
            <p className="mb-1 font-semibold">{state.errors.length} dòng lỗi, chưa được import:</p>
            <ul className="flex max-h-64 flex-col gap-0.5 overflow-y-auto text-[12.5px]">
              {state.errors.map((e, i) => (
                <li key={i}>
                  Dòng {e.row} ({e.code}): {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </form>
  );
}
