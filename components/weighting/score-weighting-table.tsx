import Link from "next/link";
import { QUESTION_TYPES, SKILL_LABELS, type Skill } from "@/lib/question-types";
import { cn } from "cn";

const SKILL_ORDER: Skill[] = ["speaking", "writing", "reading", "listening"];

const COLUMNS: { key: "overall" | "listening" | "reading" | "speaking" | "writing"; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "speaking", label: "Speaking" },
  { key: "writing", label: "Writing" },
];

export function ScoreWeightingTable({ highlightId }: { highlightId?: string }) {
  return (
    <div className="flex flex-col gap-8">
      {SKILL_ORDER.map((skill) => {
        const types = QUESTION_TYPES.filter((t) => t.skill === skill);
        return (
          <div key={skill} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-primary">
              {SKILL_LABELS[skill]}
            </h2>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Mã</th>
                    <th className="px-3 py-2 font-medium">Dạng câu hỏi</th>
                    {COLUMNS.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-right font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {types.map((type) => (
                    <tr
                      key={type.id}
                      id={type.id}
                      className={cn(
                        "border-b last:border-0 hover:bg-primary/10",
                        highlightId === type.id && "bg-primary/10"
                      )}
                    >
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {type.code}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/practice/${type.skill}/${type.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {type.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{type.descriptionVi}</p>
                      </td>
                      {COLUMNS.map((col) => {
                        const value = type.weighting?.[col.key] ?? null;
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "px-3 py-2 text-right tabular-nums text-muted-foreground",
                              value != null && value > 0 && "text-foreground"
                            )}
                          >
                            {value != null ? `${value}%` : "TBD"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-primary">Tổng cộng</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              <tr className="bg-primary/10">
                <td className="px-3 py-2" colSpan={2}>
                  <p className="font-bold">TOTAL</p>
                  <p className="text-xs text-muted-foreground">
                    Tổng tỉ trọng của cả 22 dạng câu hỏi
                  </p>
                </td>
                {COLUMNS.map((col) => (
                  <td key={col.key} className="px-3 py-2 text-right font-bold tabular-nums">
                    100%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
