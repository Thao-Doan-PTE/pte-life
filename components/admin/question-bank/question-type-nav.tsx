import Link from "next/link";
import { formatCount } from "@/components/admin/question-bank/bank-meta";
import { SKILL_LABELS, type Skill } from "@/lib/question-types";
import type { QuestionTypeCount } from "@/lib/actions/admin-questions";

const SKILL_ORDER: Skill[] = ["speaking", "writing", "reading", "listening"];

function TypeLinks({ counts, selectedType }: { counts: QuestionTypeCount[]; selectedType: string }) {
  return (
    <div className="flex flex-col gap-3">
      {SKILL_ORDER.map((skill) => {
        const items = counts.filter((c) => c.skill === skill);
        if (items.length === 0) return null;
        return (
          <div key={skill} className="flex flex-col gap-0.5">
            <p
              className="px-2 pb-1 text-[11.5px] font-semibold tracking-[0.05em] uppercase"
              style={{ color: "var(--adm-ink-3)" }}
            >
              {SKILL_LABELS[skill]}
            </p>
            {items.map((c) => {
              const active = c.questionTypeId === selectedType;
              return (
                <Link
                  key={c.questionTypeId}
                  href={`/admin/questions?type=${c.questionTypeId}`}
                  aria-current={active ? "page" : undefined}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-[var(--adm-surface-2)]"
                  style={
                    active
                      ? { background: "var(--adm-surface-2)", color: "var(--adm-ink)", fontWeight: 600 }
                      : { color: "var(--adm-ink-2)" }
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="adm-tag shrink-0" style={{ padding: "0 6px", fontSize: 11 }}>
                      {c.code}
                    </span>
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="adm-num shrink-0 text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
                    {formatCount(c.count)}
                  </span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Chuyển nhanh giữa các dạng bài ở trang quản lý từng dạng: cột trái trên màn
 * rộng, khối thu gọn trên màn hẹp. Chỉ liệt kê dạng có mẫu nhập file. */
export function QuestionTypeNav({ counts, selectedType }: { counts: QuestionTypeCount[]; selectedType: string }) {
  const current = counts.find((c) => c.questionTypeId === selectedType);
  return (
    <>
      <nav aria-label="Dạng bài" className="adm-panel hidden self-start p-2 lg:sticky lg:top-[72px] lg:block lg:max-h-[calc(100svh-88px)] lg:overflow-y-auto">
        <TypeLinks counts={counts} selectedType={selectedType} />
      </nav>
      <details key={selectedType} className="adm-panel lg:hidden">
        <summary className="cursor-pointer px-4 py-3 text-[13.5px] font-semibold">
          Đổi dạng bài{current ? ` (đang xem: ${current.code})` : ""}
        </summary>
        <nav aria-label="Dạng bài" className="border-t p-2" style={{ borderColor: "var(--adm-line)" }}>
          <TypeLinks counts={counts} selectedType={selectedType} />
        </nav>
      </details>
    </>
  );
}
