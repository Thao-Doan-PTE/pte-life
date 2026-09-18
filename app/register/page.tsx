import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-semibold">Tạo tài khoản PTE-Life</h1>
          <p className="text-sm text-muted-foreground">
            Bắt đầu luyện thi PTE Academic & PTE Core
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
