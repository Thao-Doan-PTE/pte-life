"use client";

import { cn } from "@/lib/utils";

export function RandomizeToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex rounded-lg border p-0.5 text-sm">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "flex-1 rounded-md py-1.5 transition-colors",
          !value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}
      >
        Test có sẵn
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "flex-1 rounded-md py-1.5 transition-colors",
          value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )}
      >
        Ngẫu nhiên
      </button>
    </div>
  );
}
