"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
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

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4">
      <input type="hidden" name="questionTypeId" value={questionTypeId} />
      <input type="hidden" name="csvContent" value={csvText} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          key={questionTypeId}
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
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
        />
        <Button type="submit" size="sm" disabled={isPending || !csvText}>
          {isPending ? "Đang import..." : "Import câu hỏi"}
        </Button>
      </div>
      {fileName && <p className="text-xs text-muted-foreground">Đã chọn: {fileName}</p>}
      {readError && <p className="text-xs text-destructive">{readError}</p>}

      {state && (
        <div className="flex flex-col gap-2 text-sm">
          {(state.created > 0 || state.updated > 0) && (
            <p className="text-green-600 dark:text-green-400">
              Đã thêm mới {state.created} câu, cập nhật {state.updated} câu.
            </p>
          )}
          {state.errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="mb-1 font-medium text-destructive">
                {state.errors.length} dòng lỗi, chưa được import:
              </p>
              <ul className="flex flex-col gap-0.5 text-xs text-destructive">
                {state.errors.map((e, i) => (
                  <li key={i}>
                    Dòng {e.row} ({e.code}): {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
