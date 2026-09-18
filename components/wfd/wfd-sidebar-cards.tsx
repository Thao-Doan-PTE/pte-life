import { CheckCircle2 } from "lucide-react";

export function WfdBankCard({ typeName }: { typeName: string }) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--wfd-red-tint)", borderColor: "var(--wfd-red-tint-border)" }}
    >
      <p className="text-sm font-bold uppercase" style={{ color: "var(--wfd-red-dark)" }}>
        Trọn bộ câu đề tủ {typeName}
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--wfd-muted)" }}>
        Nằm trong bộ đề tủ {typeName} được PTELife tổng hợp và cập nhật thường xuyên
        hàng tuần theo đề thi thật.
      </p>
    </div>
  );
}

/** Navy cố định của Pearson — không đổi theo theme sáng/tối, giống màu thương hiệu gốc. */
const PEARSON_NAVY = "#14123D";

export function WfdTipsCard({ tips }: { tips: string[] }) {
  if (tips.length === 0) return null;
  return (
    <div className="rounded-2xl p-5" style={{ background: PEARSON_NAVY }}>
      <p className="text-sm font-bold" style={{ color: "#FFD600" }}>
        Mẹo làm bài
      </p>
      <ul className="mt-2 flex flex-col gap-2">
        {tips.map((t) => (
          <li
            key={t}
            className="flex items-start gap-2 text-xs leading-relaxed"
            style={{ color: "#ffffff" }}
          >
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" style={{ color: "#ffffff" }} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WfdPearsonCard() {
  return (
    <div
      className="rounded-2xl border p-5 text-center"
      style={{ background: "var(--wfd-surface-2)", borderColor: "var(--wfd-border)" }}
    >
      <p
        className="text-[11px] font-bold tracking-wide uppercase"
        style={{ color: "var(--wfd-navy)" }}
      >
        Pearson
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--wfd-muted)" }}>
        Nội dung bám sát format đề thi PTE Academic của Pearson.
      </p>
    </div>
  );
}
