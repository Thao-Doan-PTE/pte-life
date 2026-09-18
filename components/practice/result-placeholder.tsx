import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ResultPlaceholder() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">Đã ghi nhận câu trả lời</p>
          <p className="text-muted-foreground">
            Chấm điểm tự động (rule-based cho trắc nghiệm/điền từ, AI cho
            Writing & Speaking) sẽ được tích hợp ở các bước sau của roadmap
            (Bước 6–8). Hiện tại bạn có thể xem lại bài làm hoặc chuyển câu.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
