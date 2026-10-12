"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("callbackUrl") as string) || "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin": {
          const code = (error as AuthError & { code?: string }).code;
          if (code === "rate_limited") return "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.";
          if (code === "account_locked") return "Tài khoản đã bị khoá. Vui lòng liên hệ PTE-Life để được hỗ trợ.";
          return "Email hoặc mật khẩu không đúng.";
        }
        default:
          return "Đã có lỗi xảy ra, vui lòng thử lại.";
      }
    }
    throw error;
  }
}
