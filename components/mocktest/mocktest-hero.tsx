import { Timer } from "lucide-react";

export function MocktestHero() {
  return (
    <div>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide sm:px-3 sm:py-1 sm:text-[13px]"
        style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
      >
        <Timer className="size-3 sm:size-3.5" />
        Mock Test
      </span>

      <h1 className="mt-2 text-[20px] font-extrabold sm:mt-3 sm:text-2xl md:text-3xl" style={{ color: "#fff" }}>
        Thi thử PTE mô phỏng
      </h1>

      <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] leading-relaxed sm:mt-2 sm:line-clamp-none sm:text-[17px]" style={{ color: "rgba(255,255,255,0.75)" }}>
        Luyện tập với hệ thống 3 dạng đề Full Test, Section Test và Question Test chuẩn cấu trúc PTE
        Academic & PTE Core. Thách thức áp lực thời gian, tối ưu chiến lược làm bài và nâng cao điểm PTE
        của bạn.
      </p>
    </div>
  );
}
