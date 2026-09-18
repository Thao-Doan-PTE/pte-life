"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ParagraphItem {
  id: string;
  text: string;
}

export function ReorderParagraphs({
  initialOrder,
  onOrderChange,
}: {
  initialOrder: ParagraphItem[];
  onOrderChange?: (order: ParagraphItem[]) => void;
}) {
  const [order, setOrder] = useState(initialOrder);

  const move = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= order.length) return;
    const next = [...order];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setOrder(next);
    onOrderChange?.(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Dùng nút mũi tên để sắp xếp lại thứ tự đoạn văn cho đúng.
      </p>
      {order.map((p, i) => (
        <div key={p.id} className="flex items-start gap-3 rounded-lg border bg-card p-3">
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              aria-label="Chuyển lên"
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={i === order.length - 1}
              onClick={() => move(i, 1)}
              aria-label="Chuyển xuống"
            >
              <ChevronDown className="size-3.5" />
            </Button>
          </div>
          <p className="pt-1 text-sm">{p.text}</p>
        </div>
      ))}
    </div>
  );
}
