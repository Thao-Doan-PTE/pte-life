"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { bulkDeleteQuestionsAction } from "@/lib/actions/admin-questions";
import { DeleteQuestionButton } from "@/components/admin/delete-question-button";
import { formatDate } from "@/lib/format";

interface QuestionRow {
  id: string;
  code: string;
  availableIn: string[];
  createdAt: string;
}

export function QuestionBulkList({
  questions,
  questionTypeId,
}: {
  questions: QuestionRow[];
  questionTypeId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = questions.length > 0 && selected.size === questions.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(questions.map((q) => q.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (questions.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground">
        Chưa có câu hỏi nào cho dạng này.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="size-4" />
          Chọn tất cả ({questions.length})
        </label>

        {selected.size > 0 && (
          <form
            action={bulkDeleteQuestionsAction}
            onSubmit={(e) => {
              if (!confirm(`Xoá ${selected.size} câu đã chọn? Không thể hoàn tác.`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="questionTypeId" value={questionTypeId} />
            {Array.from(selected).map((id) => (
              <input key={id} type="hidden" name="ids" value={id} />
            ))}
            <Button type="submit" size="sm" variant="destructive">
              Xoá đã chọn ({selected.size})
            </Button>
          </form>
        )}
      </div>

      <div className="flex flex-col divide-y rounded-xl border bg-card">
        {questions.map((q) => (
          <div key={q.id} className="flex items-center gap-3 px-4 py-2 text-sm">
            <input
              type="checkbox"
              checked={selected.has(q.id)}
              onChange={() => toggleOne(q.id)}
              className="size-4 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <span className="font-medium">{q.code}</span>{" "}
              <span className="text-xs text-muted-foreground">
                {q.availableIn.join(", ")} · {formatDate(q.createdAt)}
              </span>
            </div>
            <DeleteQuestionButton id={q.id} questionTypeId={questionTypeId} code={q.code} />
          </div>
        ))}
      </div>
    </div>
  );
}
