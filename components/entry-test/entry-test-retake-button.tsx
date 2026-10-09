"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { startNewEntryTestAttempt } from "@/lib/actions/entry-test-attempt";

export function EntryTestRetakeButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await startNewEntryTestAttempt();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-[15px] font-semibold disabled:opacity-50"
        style={{ borderColor: "var(--rail-line)", color: "var(--rail-charcoal)" }}
      >
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Làm lại Test đầu vào
      </button>
      {error && (
        <p className="m-0 mt-1 text-[13px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
