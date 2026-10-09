"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { lookupWordAction, saveWordAction, type WordLookupResult } from "@/lib/actions/vocabulary";

interface PopupState {
  word: string;
  x: number;
  y: number;
  loading: boolean;
  result: WordLookupResult | null;
  saved: boolean;
}

const POPUP_WIDTH = 260;

/** Bọc quanh 1 đoạn văn tiếng Anh, cho phép chạm/click vào từng từ để tra
 * nhanh phiên âm + nghĩa tiếng Việt (dictionaryapi.dev + MyMemory, đều miễn
 * phí, không cần key) và lưu vào Sổ từ vựng cá nhân. Chỉ dùng cho đoạn văn
 * thuần hiển thị (không có tương tác click/drag riêng như chỗ trống hay kéo
 * thả) để tránh xung đột thao tác. */
export function TappableText({ text, className }: { text: string; className?: string }) {
  const [popup, setPopup] = useState<PopupState | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popup) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideText = containerRef.current?.contains(target);
      const insidePopup = popupRef.current?.contains(target);
      if (!insideText && !insidePopup) {
        setPopup(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popup]);

  const handleWordClick = (raw: string, e: React.MouseEvent<HTMLSpanElement>) => {
    const clean = raw.replace(/[^a-zA-Z'-]/g, "");
    if (!clean) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 12);
    setPopup({ word: clean, x: Math.max(12, x), y: rect.bottom + 6, loading: true, result: null, saved: false });

    lookupWordAction(clean).then((result) => {
      setPopup((p) => (p && p.word === clean ? { ...p, loading: false, result } : p));
    });
  };

  const handleSave = async () => {
    if (!popup?.result) return;
    try {
      await saveWordAction(popup.result.word, popup.result.phonetic, popup.result.meaningVi);
      setPopup((p) => (p ? { ...p, saved: true } : p));
    } catch {
      // Bỏ qua — học viên có thể bấm lưu lại.
    }
  };

  const tokens = text.split(/(\s+)/);

  return (
    <span ref={containerRef} className={className}>
      {tokens.map((token, i) =>
        /^\s+$/.test(token) || token === "" ? (
          token
        ) : (
          <span
            key={i}
            onClick={(e) => handleWordClick(token, e)}
            className="cursor-pointer rounded transition-colors hover:bg-amber-200/60"
          >
            {token}
          </span>
        )
      )}

      {popup &&
        createPortal(
          <div
            ref={popupRef}
            className="fixed z-50 flex flex-col gap-2 rounded-xl border p-3 shadow-lg"
            style={{
              left: popup.x,
              top: popup.y,
              width: POPUP_WIDTH,
              background: "var(--wfd-surface)",
              borderColor: "var(--wfd-border)",
            }}
          >
            {popup.loading ? (
              <div className="flex items-center gap-2 text-[15px]" style={{ color: "var(--wfd-muted)" }}>
                <Loader2 className="size-4 animate-spin" /> Đang tra nghĩa...
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-bold">{popup.result?.word ?? popup.word}</span>
                  {popup.result?.phonetic && (
                    <span className="wfd-mono text-[15px]" style={{ color: "var(--wfd-muted)" }}>
                      {popup.result.phonetic}
                    </span>
                  )}
                </div>
                <p className="text-[15px]" style={{ color: "var(--wfd-ink)" }}>
                  {popup.result?.meaningVi ?? "Không tìm thấy nghĩa cho từ này."}
                </p>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={popup.saved}
                  className="rounded-lg px-3 py-1.5 text-[15px] font-semibold text-white disabled:opacity-60"
                  style={{ background: "var(--wfd-navy)" }}
                >
                  {popup.saved ? "✓ Đã lưu" : "+ Lưu vào Sổ từ vựng"}
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </span>
  );
}
