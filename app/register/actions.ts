"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ExamPackage } from "@/lib/question-types";

export async function registerAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  const examPackage = formData.get("examPackage");

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 6 ||
    (examPackage !== "academic" && examPackage !== "core")
  ) {
    return "Vui lòng điền đầy đủ thông tin (mật khẩu tối thiểu 6 ký tự).";
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return "Email này đã được đăng ký.";
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim(),
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
