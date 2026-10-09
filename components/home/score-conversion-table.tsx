/** Mốc PTE Academic tối thiểu tương ứng với từng band IELTS Academic (Pearson, cập nhật 07/2025). */
const CONVERSION: { pte: number; ielts: string }[] = [
  { pte: 24, ielts: "4.5" },
  { pte: 31, ielts: "5.0" },
  { pte: 39, ielts: "5.5" },
  { pte: 47, ielts: "6.0" },
  { pte: 55, ielts: "6.5" },
  { pte: 63, ielts: "7.0" },
  { pte: 71, ielts: "7.5" },
  { pte: 79, ielts: "8.0" },
  { pte: 86, ielts: "8.5" },
  { pte: 90, ielts: "9.0" },
];

export function ScoreConversionTable() {
  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--rail-bg)", borderColor: "var(--rail-line)", boxShadow: "0 10px 30px -14px rgba(43,33,32,.28), 0 2px 6px rgba(43,33,32,.06)" }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-center text-[15px]">
          <caption className="sr-only">Bảng quy đổi điểm PTE Academic sang IELTS Academic</caption>
          <tbody>
            <tr>
              <th scope="row" className="px-4 py-3 text-left text-[14px] font-bold whitespace-nowrap" style={{ background: "var(--rail-charcoal)", color: "var(--rail-cta-text)" }}>
                PTE Academic Overall*
              </th>
              {CONVERSION.map((c) => (
                <td key={c.pte} className="px-3 py-3 text-[17px] font-bold tabular-nums" style={{ background: "var(--rail-charcoal)", color: "var(--rail-cta-text)", borderLeft: "1px solid rgba(255,255,255,.18)" }}>
                  {c.pte}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="px-4 py-3 text-left text-[14px] font-bold whitespace-nowrap" style={{ background: "var(--rail-surface)", color: "var(--rail-charcoal)" }}>
                IELTS Academic Overall
              </th>
              {CONVERSION.map((c) => (
                <td key={c.pte} className="px-3 py-3 text-[17px] font-semibold tabular-nums" style={{ background: "var(--rail-surface-card)", color: "var(--rail-charcoal)", borderLeft: "1px solid var(--rail-line)" }}>
                  {c.ielts}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="m-0 mt-3 text-[13px] leading-relaxed" style={{ color: "var(--rail-ink-dim)" }}>
        <span style={{ color: "var(--rail-red-text)" }}>*</span> Đây là ngưỡng điểm PTE tối thiểu tương ứng với từng band IELTS. Nguồn: Pearson (cập nhật 07/2025), chỉ mang tính tham khảo — mỗi trường, cơ quan có thể áp dụng bảng quy đổi riêng.
      </p>
    </div>
  );
}
