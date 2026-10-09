"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWordAction } from "@/lib/actions/vocabulary";

export interface VocabularyItem {
  id: string;
  word: string;
  phonetic: string | null;
  meaningVi: string | null;
  createdAt: string;
}

export function VocabularyList({ items }: { items: VocabularyItem[] }) {
  const [words, setWords] = useState(items);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
    startTransition(async () => {
      await deleteWordAction(id);
    });
  };

  if (words.length === 0) {
    return (
      <p className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
        Chưa có từ nào được lưu — chạm vào 1 từ trong đoạn văn lúc luyện tập để lưu vào đây.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {words.map((w) => (
        <div
          key={w.id}
          className="flex items-center justify-between gap-3 rounded-xl border p-4"
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="font-bold">{w.word}</span>
              {w.phonetic && (
                <span className="wfd-mono text-sm text-muted-foreground">{w.phonetic}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {w.meaningVi ?? "Chưa tra được nghĩa."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleDelete(w.id)}
            disabled={isPending}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
