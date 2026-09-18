import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function FullTestCard() {
  return (
    <Card className="opacity-70">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileText className="size-5" />
          </div>
          <Badge variant="secondary">Sắp ra mắt</Badge>
        </div>
        <div>
          <p className="font-medium">Full Test</p>
          <p className="text-sm text-muted-foreground">
            Mô phỏng đầy đủ bài thi thật, đủ 4 kỹ năng theo đúng thời lượng thi.
          </p>
        </div>
        <Button disabled className="mt-1">
          Bắt đầu
        </Button>
      </CardContent>
    </Card>
  );
}
