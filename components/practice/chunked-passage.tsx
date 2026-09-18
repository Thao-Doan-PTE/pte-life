"use client";

import { useState } from "react";

function chunkText(text: string, size: number) {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(" "));
  }
  return chunks;
}

export function ChunkedPassage({ text }: { text: string }) {
  const [chunked, setChunked] = useState(false);
  const chunks = chunkText(text, 4);

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Bài đọc
        </p>
        <button
          type="button"
          onClick={() => setChunked((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {chunked ? "Ẩn chia cụm từ" : "Hiển thị chia cụm từ"}
        </button>
      </div>
      <p className="text-base leading-relaxed">
        {chunked
          ? chunks.map((chunk, i) => (
              <span
                key={i}
                className="mr-2 inline-block border-b-2 border-primary/30 pb-0.5"
              >
                {chunk}
              </span>
            ))
          : text}
      </p>
    </div>
  );
}
