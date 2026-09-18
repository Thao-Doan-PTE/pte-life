"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deleteMockTestSession } from "@/lib/actions/mocktest";
import { mockTestSessionLabel } from "@/lib/mocktest-label";
import { formatRelativeOrDate, scoreColorClass } from "@/lib/format";

export interface MocktestHistoryItem {
  id: string;
  mode: string;
  skill: string | null;
  questionTypeId: string | null;
  status: string;
  scorePct: number | null;
  startedAt: string;
}

const TABS: { value: string; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "full", label: "Đề thi đầy đủ" },
  { value: "section", label: "Thi theo phần" },
  { value: "question", label: "Thi theo dạng câu hỏi" },
];

export function MocktestHistoryList({ items }: { items: MocktestHistoryItem[] }) {
  const [tab, setTab] = useState("all");
  const [rows, setRows] = useState(items);
  const [isPending, startTransition] = useTransition();

  const filtered = tab === "all" ? rows : rows.filter((r) => r.mode === tab);

  const handleDelete = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => {
      deleteMockTestSession(id);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Chưa có bài test nào.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-xl border bg-card">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">
                  {mockTestSessionLabel(item)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant={item.status === "completed" ? "secondary" : "outline"}
                    className="text-[10px]"
                  >
                    {item.status === "completed" ? "Hoàn thành" : "Đang làm dở"}
                  </Badge>
                  <span>{formatRelativeOrDate(item.startedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.scorePct !== null && (
                  <span className={cn("text-sm font-semibold", scoreColorClass(item.scorePct))}>
                    {item.scorePct}%
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      href={
                        item.status === "completed"
                          ? `/mocktest/session/${item.id}/result`
                          : `/mocktest/session/${item.id}`
                      }
                    />
                  }
                >
                  {item.status === "completed" ? "Xem kết quả" : "Tiếp tục"}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDelete(item.id)}
                  aria-label="Xóa"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
