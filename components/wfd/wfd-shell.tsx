import type { ReactNode } from "react";
import { jetbrainsMono } from "@/lib/wfd-fonts";

export function WfdShell({ children }: { children: ReactNode }) {
  return <div className={`wfd-theme min-h-screen ${jetbrainsMono.variable}`}>{children}</div>;
}
