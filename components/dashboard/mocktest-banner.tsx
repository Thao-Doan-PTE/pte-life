import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MocktestBanner() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-xl bg-primary px-6 py-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold">Thử Mocktest</h2>
        <p className="text-sm text-primary-foreground/90">
          Làm bài thi mô phỏng PTE Academic & PTE Core theo cấu trúc thật.
        </p>
      </div>
      <Button
        className="shrink-0 gap-1 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
        nativeButton={false}
        render={<Link href="/mocktest" />}
      >
        Bắt đầu <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
