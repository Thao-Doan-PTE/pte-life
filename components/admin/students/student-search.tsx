"use client";

import { useEffect, useId, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/** Ô tìm học viên theo tên/email (lọc ở server, không phân biệt dấu). Gõ tới đâu
 * cập nhật ?q= tới đó (trễ 300ms), giữ nguyên các bộ lọc khác trên URL. */
export function StudentSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function navigate(q: string) {
    // Đọc URL lúc gửi (không lấy từ props) để không ghi đè bộ lọc vừa bấm trong lúc chờ.
    const sp = new URLSearchParams(window.location.search);
    sp.delete("student");
    const trimmed = q.trim();
    if (trimmed) sp.set("q", trimmed);
    else sp.delete("q");
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `/admin/students?${qs}` : "/admin/students", { scroll: false });
    });
  }

  return (
    <form
      role="search"
      className="relative w-full sm:w-[240px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        navigate(String(new FormData(e.currentTarget).get("q") ?? ""));
      }}
    >
      <label htmlFor={`${id}-q`} className="sr-only">
        Tìm học viên theo tên hoặc email
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        style={{ color: "var(--adm-ink-3)" }}
        aria-hidden="true"
      />
      <input
        id={`${id}-q`}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Tìm tên hoặc email…"
        autoComplete="off"
        maxLength={100}
        aria-busy={pending || undefined}
        className="adm-input w-full"
        style={{ paddingLeft: 32 }}
        onChange={(e) => {
          const value = e.target.value;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => navigate(value), 300);
        }}
      />
    </form>
  );
}
