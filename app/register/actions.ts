"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findUserByEmail } from "@/lib/user-email";
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";
import type { ExamPackage } from "@/lib/question-types";

export async function registerAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = formData.get("password");
  const examPackage = formData.get("examPackage");

  if (
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 200 ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 200 ||
    (examPackage !== "academic" && examPackage !== "core")
  ) {
    return "Vui lòng điền đầy đủ thông tin (email hợp lệ, mật khẩu tối thiểu 8 ký tự).";
  }

  const existing = await findUserByEmail(email, { id: true });
  if (existing) {
    return "Email này đã được đăng ký.";
  }

  if (!(await consumeRateLimit("signupIp", await getRequestIp()))) {
    return "Bạn đã tạo quá nhiều tài khoản, vui lòng thử lại sau.";
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      examPackage: examPackage as ExamPackage,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      reservationsLeft: 2,
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Tạo tài khoản thành công nhưng đăng nhập tự động thất bại, vui lòng đăng nhập lại.";
    }
    throw error;
  }
}
