"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** Ô tick lọc có trạng thái nằm trên URL (giữ khi tải lại): tick/bỏ tick thì
 * chuyển sang `href` (URL của trạng thái ngược lại). */
export function UrlToggle({ checked, href, label }: { checked: boolean; href: string; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={isPending}
        onChange={() => startTransition(() => router.replace(href, { scroll: false }))}
        className="size-4"
        style={{ accentColor: "var(--adm-brand)" }}
      />
      {label}
    </label>
  );
}

/** Ô tick "Chỉ xem số câu Tủ" (?tu=1). */
export function TuOnlyToggle({ checked, href }: { checked: boolean; href: string }) {
  return <UrlToggle checked={checked} href={href} label="Chỉ xem số câu Tủ" />;
}
