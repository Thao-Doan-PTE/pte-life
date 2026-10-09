"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { uploadAvatarAction } from "@/lib/actions/avatar";

export function AccountAvatarUpload({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [currentUrl, setCurrentUrl] = useState(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    const formData = new FormData();
    formData.append("avatar", file);
    startTransition(async () => {
      const res = await uploadAvatarAction(formData);
      if (res.ok && res.avatarUrl) {
        setCurrentUrl(res.avatarUrl);
        router.refresh();
      } else {
        setError(res.error ?? "Không thể tải ảnh lên. Thử lại sau.");
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full"
        style={{ background: "var(--rail-surface)" }}
        aria-label="Đổi ảnh đại diện"
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh có thể từ Vercel Blob (domain động), tránh cấu hình remotePatterns
          <img src={currentUrl} alt={name} className="size-16 rounded-full object-cover" />
        ) : (
          <span className="text-[20px] font-bold" style={{ color: "var(--rail-ink)" }}>
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
        </span>
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="text-[15px] font-semibold"
          style={{ color: "var(--rail-red-text)" }}
        >
          {isPending ? "Đang tải lên..." : "Đổi ảnh đại diện"}
        </button>
        <p className="m-0 mt-0.5 text-[13px]" style={{ color: "var(--rail-ink-dim)" }}>
          JPG, PNG hoặc WEBP, tối đa 3MB.
        </p>
        {error && (
          <p className="m-0 mt-1 text-[13px] font-semibold" style={{ color: "var(--rail-red-text)" }}>
            {error}
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />
    </div>
  );
}
