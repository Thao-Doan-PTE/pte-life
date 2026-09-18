import type { ReactNode } from "react";
import { beVietnamPro, jetbrainsMono } from "@/lib/wfd-fonts";

export function WfdShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`wfd-theme min-h-screen ${beVietnamPro.variable} ${jetbrainsMono.variable}`}
    >
      {children}
    </div>
  );
}
