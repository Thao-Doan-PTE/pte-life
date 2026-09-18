import { Info } from "lucide-react";
import type { SpeakingGradeResult } from "@/lib/scoring/ai/speaking-index";

const CRITERION_LABELS: Record<string, string> = {
  content: "Nội dung",
  pronunciation: "Phát âm",
  fluency: "Độ trôi chảy",
  vocabulary: "Từ vựng",
};

export function SpeakingReview({
  transcript,
  wordsPerMinute,
  fillerWordCount,
  grade,
}: {
  transcript: string;
  wordsPerMinute: number;
  fillerWordCount: number;
  grade: SpeakingGradeResult;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-600" />
        <p>
          Phiên bản hiện tại nhận diện giọng nói bằng trình duyệt (Web Speech
          API) và chưa tích hợp công cụ phân tích phát âm chuyên dụng. Điểm
          Phát âm là placeholder — sẽ được thay bằng đánh giá thật ở bản nâng
          cấp V2.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Bản ghi giọng nói (tự động nhận diện)
        </p>
        <p className="text-sm italic text-muted-foreground">
          {transcript || "(không nhận dạng được giọng nói)"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Tốc độ nói: {wordsPerMinute} từ/phút · Từ đệm: {fillerWordCount}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          Điểm theo tiêu chí
        </p>
        {Object.entries(grade.criteria).map(([key, c]) => (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{CRITERION_LABELS[key] ?? key}</span>
              <span className="text-muted-foreground">{c.scorePct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${c.scorePct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{c.feedback}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/40 p-4 text-sm">
        <p className="mb-1 font-medium">Nhận xét chung</p>
        <p className="text-muted-foreground">{grade.generalFeedback}</p>
      </div>
    </div>
  );
}
