import { AppShell } from "@/components/layout/app-shell";
import { ScoreWeightingTable } from "@/components/weighting/score-weighting-table";

export default async function WeightingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  return (
    <AppShell>
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-10 sm:px-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Bảng tỉ trọng chấm điểm</h1>
          <p className="text-sm text-muted-foreground">
            Mỗi dạng câu hỏi đóng góp bao nhiêu % vào điểm Overall và vào từng điểm kỹ
            năng (Listening/Reading/Speaking/Writing) của PTE Academic.
          </p>
        </div>

        <ScoreWeightingTable highlightId={type} />

        <p className="text-xs text-muted-foreground">
          Nguồn: PTE Academic Score Guide (Pearson). Số liệu áp dụng cho PTE Academic;
          PTE Core có cách tính điểm riêng nên các con số này chỉ mang tính tham khảo
          cho các dạng câu tương ứng.
        </p>
      </div>
    </AppShell>
  );
}
