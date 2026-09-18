"use client";

import { Button } from "@/components/ui/button";
import { deleteQuestionAction } from "@/lib/actions/admin-questions";

export function DeleteQuestionButton({
  id,
  questionTypeId,
  code,
}: {
  id: string;
  questionTypeId: string;
  code: string;
}) {
  return (
    <form
      action={deleteQuestionAction}
      onSubmit={(e) => {
        if (!confirm(`Xoá câu hỏi ${code}? Không thể hoàn tác.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="questionTypeId" value={questionTypeId} />
      <Button type="submit" size="sm" variant="ghost" className="text-destructive hover:text-destructive">
        Xoá
      </Button>
    </form>
  );
}
