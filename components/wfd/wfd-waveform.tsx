"use client";

function seededHeights(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    heights.push(20 + (h % 80));
  }
  return heights;
}

export function WfdWaveform({ seed, progress }: { seed: string; progress: number }) {
  const heights = seededHeights(seed, 29);
  return (
    <div className="flex h-10 items-center gap-[3px]">
      {heights.map((h, i) => {
        const played = i / heights.length < progress;
        return (
          <span
            key={i}
            className="w-[3px] shrink-0 rounded-full transition-colors"
            style={{ height: `${h}%`, background: played ? "var(--wfd-red)" : "#DAD6E6" }}
          />
        );
      })}
    </div>
  );
}
