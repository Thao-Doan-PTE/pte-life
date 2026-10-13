import Link from "next/link";
import { formatCount, SKILL_GROUPS, skillGroupOf, type SkillGroup } from "@/components/admin/question-bank/bank-meta";
import type { QuestionTypeCount } from "@/lib/actions/admin-questions";

/** 4 thẻ tổng của Ngân hàng đề: 3 thẻ kỹ năng (bấm để lọc bảng dạng bài, bấm lại
 * để bỏ lọc) + thẻ "Câu thuộc đề Tủ" (chỉ hiển thị). */
export function BankSummaryCards({
  counts,
  activeGroup,
  hrefForGroup,
}: {
  counts: QuestionTypeCount[];
  activeGroup: SkillGroup | null;
  hrefForGroup: (group: SkillGroup | null) => string;
}) {
  const totalTu = counts.reduce((sum, c) => sum + c.tuCount, 0);
  const tuTypes = counts.filter((c) => c.tuCount > 0).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {SKILL_GROUPS.map((g) => {
        const types = counts.filter((c) => skillGroupOf(c.skill) === g.key);
        const total = types.reduce((sum, c) => sum + c.count, 0);
        const active = activeGroup === g.key;
        return (
          <Link
            key={g.key}
            href={hrefForGroup(active ? null : g.key)}
            scroll={false}
            aria-current={active ? "true" : undefined}
            aria-label={`${g.label}: ${formatCount(total)} câu, ${types.length} dạng bài${active ? " — đang lọc, bấm để bỏ lọc" : " — bấm để lọc"}`}
            className="adm-kpi min-w-0"
            style={active ? { borderColor: "var(--adm-ink)", boxShadow: "inset 0 0 0 1px var(--adm-ink)" } : undefined}
          >
            <span className="truncate text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
              {g.label}
            </span>
            <span className="adm-num text-[24px] leading-[1.15] font-semibold">{formatCount(total)}</span>
            <span className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
              {types.length} dạng bài{active ? " · đang lọc" : ""}
            </span>
          </Link>
        );
      })}
      <div className="adm-kpi min-w-0">
        <span className="truncate text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
          Câu thuộc đề Tủ
        </span>
        <span className="adm-num text-[24px] leading-[1.15] font-semibold" style={{ color: "var(--adm-brand-text)" }}>
          {formatCount(totalTu)}
        </span>
        <span className="text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          {tuTypes > 0 ? `Có ở ${tuTypes} dạng bài` : "Chưa có câu Tủ"}
        </span>
      </div>
    </div>
  );
}
