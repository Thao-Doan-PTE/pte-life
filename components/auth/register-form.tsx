"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExamPackage } from "@/lib/question-types";

export function RegisterForm() {
  const [examPackage, setExamPackage] = useState<ExamPackage>("academic");
  const [error, formAction, isPending] = useActionState(
    registerAction,
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="examPackage" value={examPackage} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Họ và tên</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ban@email.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="package-trigger">Gói học</Label>
        <Select
          value={examPackage}
          onValueChange={(value) => setExamPackage(value as ExamPackage)}
        >
          <SelectTrigger id="package-trigger" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="academic">PTE Academic</SelectItem>
            <SelectItem value="core">PTE Core</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isPending}
        className="mt-1 bg-brand-accent text-brand-accent-foreground hover:bg-brand-accent/90"
      >
        {isPending ? "Đang tạo tài khoản..." : "Đăng ký"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
