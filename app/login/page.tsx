import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-semibold">Đăng nhập PTE-Life</h1>
          <p className="text-sm text-muted-foreground">
            Luyện đề PTE Academic & PTE Core
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <div className="mt-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          <p className="font-medium">Tài khoản demo (Bước 2 — mock):</p>
          <p>hocvien@ptelife.vn / pte123456 (PTE Academic)</p>
          <p>hocvien.core@ptelife.vn / pte123456 (PTE Core)</p>
        </div>
      </div>
    </div>
  );
}
