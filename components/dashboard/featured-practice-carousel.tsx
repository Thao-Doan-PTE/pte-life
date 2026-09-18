import type { ComponentType } from "react";
import Link from "next/link";
import { Headphones, Mic, BookOpen, FileText, Zap } from "lucide-react";

interface FeaturedType {
  id: string;
  abbr: string;
  skillLabel: string;
  name: string;
  difficulty: "Dễ" | "Trung bình" | "Khó";
  description: string;
  icon: ComponentType<{ className?: string }>;
  iconStyle: string;
}

const DIFFICULTY_COLOR: Record<FeaturedType["difficulty"], string> = {
  "Dễ": "text-green-600 dark:text-green-400",
  "Trung bình": "text-amber-500",
  "Khó": "text-destructive",
};

const FEATURED_TYPES: FeaturedType[] = [
  {
    id: "write-from-dictation",
    abbr: "WFD",
    skillLabel: "LISTENING",
    name: "Write From Dictation",
    difficulty: "Trung bình",
    description:
      "Nghe và gõ lại chính xác từng câu đề tủ — chỉ nghe được một lần, đúng luật thi thật — để rèn chính tả, ngữ pháp và tốc độ gõ.",
    icon: Headphones,
    iconStyle: "bg-red-500/10 text-red-500",
  },
  {
    id: "repeat-sentence",
    abbr: "RS",
    skillLabel: "SPEAKING",
    name: "Repeat Sentence",
    difficulty: "Trung bình",
    description:
      "Nghe và lặp lại chính xác câu đề tủ — luyện phát âm, ngữ điệu và trí nhớ ngắn hạn bám sát format thi thật.",
    icon: Mic,
    iconStyle: "bg-violet-500/10 text-violet-500",
  },
  {
    id: "reading-fill-blanks-dropdown",
    abbr: "FIB-RW",
    skillLabel: "READING",
    name: "Fill In the Blanks",
    difficulty: "Khó",
    description:
      "Đọc đoạn văn và điền từ phù hợp vào chỗ trống — rèn từ vựng học thuật và khả năng nắm mạch văn bám sát format thi thật.",
    icon: BookOpen,
    iconStyle: "bg-blue-500/10 text-blue-500",
  },
];

export function FeaturedPracticeCarousel({ counts }: { counts: Record<string, number> }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Đề luyện nổi bật</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        3 dạng bài trọng tâm — luyện kèm đề tủ mới nhất theo từng kỹ năng, được cập nhật thường
        xuyên.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FEATURED_TYPES.map((type) => {
          const Icon = type.icon;
          const count = counts[type.id] ?? 0;
          return (
            <div key={type.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${type.iconStyle}`}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Đề tủ · {type.skillLabel}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
                      {type.abbr}
                    </span>
                    <p className="truncate font-semibold">{type.name}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="size-3.5" /> {count} câu
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="size-3.5" /> Độ khó:{" "}
                  <span className={`font-semibold ${DIFFICULTY_COLOR[type.difficulty]}`}>
                    {type.difficulty}
                  </span>
                </span>
              </div>

              <p className="text-sm text-muted-foreground">{type.description}</p>

              <Link
                href={`/practice/${type.skillLabel.toLowerCase()}/${type.id}`}
                className="mt-auto flex items-center justify-center rounded-[10px] bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Luyện {type.abbr} ngay
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
