import type { CSSProperties, ReactNode } from "react";

export function StageIntro({
  eyebrow,
  title,
  lead,
  ticks,
  cta,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  ticks?: string[];
  cta?: ReactNode;
}) {
  return (
    <div>
      <p className="m-0 text-[13px] font-bold tracking-[0.12em] uppercase" style={{ color: "var(--rail-red)" }}>
        {eyebrow}
      </p>
      <h2 className="mt-2.5 mb-3.5 text-[clamp(28px,3.4vw,44px)] leading-[1.12] font-bold text-balance" style={{ color: "var(--rail-charcoal)" }}>
        {title}
      </h2>
      <p className="mb-6 max-w-[46ch]" style={{ color: "var(--rail-ink-dim)" }}>
        {lead}
      </p>
      {ticks && ticks.length > 0 && (
        <ul className="m-0 mb-7 flex list-none flex-col gap-2.5 p-0">
          {ticks.map((t, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 size-[18px] shrink-0 rounded-full"
                style={{ background: "var(--rail-red-tint)", boxShadow: "inset 0 0 0 5px var(--rail-red-tint), inset 0 0 0 9px var(--rail-red)" }}
              />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
      {cta && <div className="flex flex-wrap items-center gap-3">{cta}</div>}
    </div>
  );
}

export function StageCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      data-card
      className="h-full min-w-0 rounded-2xl p-5.5"
      style={{ background: "var(--rail-bg)", boxShadow: "0 10px 28px -10px rgba(43,33,32,.18), 0 2px 6px rgba(43,33,32,.05)", ...style }}
    >
      {children}
    </div>
  );
}

export function GhostLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="rail-ghost-btn inline-flex h-12 items-center border px-5 font-semibold transition-colors">
      {children}
    </a>
  );
}

export function RedLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex h-12 items-center gap-2.5 px-5.5 font-semibold text-white transition-colors"
      style={{ background: "var(--rail-red)" }}
    >
      {children}
    </a>
  );
}
