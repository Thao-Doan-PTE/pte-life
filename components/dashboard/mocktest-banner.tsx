import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MocktestBanner() {
  return (
    <div
      className="flex flex-col items-start gap-4 rounded-xl px-6 py-6 sm:flex-row sm:items-center sm:justify-between"
      style={{ background: "linear-gradient(135deg, #0D004D 0%, #241080 100%)" }}
    >
      <div>
        <h2 className="text-lg font-semibold text-white">Thử Mocktest</h2>
        <p className="text-sm text-white/70">Làm bài thi mô phỏng PTE Academic & PTE Core theo cấu trúc thật.</p>
      </div>
      <Button
        className="shrink-0 gap-1 rounded-full bg-yellow-400 text-yellow-950 hover:bg-yellow-500"
        nativeButton={false}
        render={<Link href="/mocktest" />}
      >
        Bắt đầu <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
