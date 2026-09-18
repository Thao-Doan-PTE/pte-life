export function WeeklyProgressChart({
  trend,
  avgPerDay,
}: {
  trend: { dayLabel: string; count: number }[];
  avgPerDay: number;
}) {
  const width = 700;
  const height = 240;
  const paddingX = 24;
  const topY = 44;
  const bottomY = 186;
  const maxValue = Math.max(1, ...trend.map((d) => d.count));

  const points = trend.map((d, i) => {
    const x = paddingX + (i * (width - paddingX * 2)) / Math.max(1, trend.length - 1);
    const y = bottomY - (d.count / maxValue) * (bottomY - topY);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? 0} ${bottomY} L ${points[0]?.x ?? 0} ${bottomY} Z`;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tiến độ 7 ngày</h3>
        <p className="text-xs text-muted-foreground">
          TB: <span className="font-semibold text-foreground">{avgPerDay}</span> câu/ngày
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Tiến độ luyện tập 7 ngày qua">
        <path d={areaPath} className="fill-primary/10" />
        <path d={linePath} className="fill-none stroke-primary" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} className="fill-primary" />
            <text x={p.x} y={p.y - 12} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
              {p.count}
            </text>
            <text x={p.x} y={bottomY + 24} textAnchor="middle" className="fill-muted-foreground text-[12px]">
              {p.dayLabel}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
