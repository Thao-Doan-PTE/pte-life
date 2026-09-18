"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  changePackageAction,
  extendExpiryAction,
  useReservationAction,
} from "@/lib/actions/admin";
import { formatDate } from "@/lib/format";
import type { ExamPackage } from "@/lib/question-types";

export interface AdminUserRowData {
  id: string;
  name: string;
  email: string;
  examPackage: ExamPackage;
  expiresAt: string;
  reservationsLeft: number;
}

export function AdminUserRow({ user }: { user: AdminUserRowData }) {
  const [pkg, setPkg] = useState<ExamPackage>(user.examPackage);
  const [days, setDays] = useState("30");

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant={user.examPackage === "academic" ? "default" : "outline"}>
            {user.examPackage === "academic" ? "PTE Academic" : "PTE Core"}
          </Badge>
          <span className="text-muted-foreground">
            Hết hạn: {formatDate(user.expiresAt)}
          </span>
          <span className="text-muted-foreground">
            · Bảo lưu còn: {user.reservationsLeft}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t pt-3">
        <form action={changePackageAction} className="flex items-end gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="examPackage" value={pkg} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Đổi gói</label>
            <Select
              items={{ academic: "PTE Academic", core: "PTE Core" }}
              value={pkg}
              onValueChange={(v) => v && setPkg(v as ExamPackage)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="academic">PTE Academic</SelectItem>
                <SelectItem value="core">PTE Core</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" variant="outline">
            Lưu
          </Button>
        </form>

        <form action={extendExpiryAction} className="flex items-end gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Gia hạn (ngày)</label>
            <Input
              type="number"
              name="days"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-24"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Gia hạn
          </Button>
        </form>

        <form action={useReservationAction}>
          <input type="hidden" name="userId" value={user.id} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={user.reservationsLeft <= 0}
          >
            Dùng 1 lượt bảo lưu
          </Button>
        </form>
      </div>
    </div>
  );
}
