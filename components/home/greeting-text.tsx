"use client";

import { useState } from "react";

const VISITED_KEY = "ptelife-visited-overview";

export function GreetingText({ name }: { name: string }) {
  const [returning] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const visited = Boolean(localStorage.getItem(VISITED_KEY));
      localStorage.setItem(VISITED_KEY, "1");
      return visited;
    } catch {
      return false;
    }
  });

  return (
    <p className="m-0 text-[22px] font-normal" style={{ color: "var(--rail-charcoal)" }} suppressHydrationWarning>
      {returning ? `Welcome back, ${name}!` : `Xin chào, ${name}!`} <span className="animate-wave">👋</span>
    </p>
  );
}
