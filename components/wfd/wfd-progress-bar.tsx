export function WfdProgressBar({ pct }: { pct: number }) {
  return (
    <div className="h-1 w-full" style={{ background: "var(--wfd-border)" }}>
      <div
        className="h-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: "var(--wfd-red)" }}
      />
    </div>
  );
}
