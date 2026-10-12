"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { findUserByEmail } from "@/lib/user-email";
import { consumeRateLimit, getRequestIp } from "@/lib/rate-limit";
import type { EntryTestPurpose } from "@/lib/generated/prisma/enums";

const PHONE_RE = /^(0|\+84)[35789]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EntryTestLeadState {
  success?: boolean;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "password" | "target" | "goal", string>>;
  values?: Partial<Record<"name" | "phone" | "email" | "target" | "goal" | "when", string>>;
}

export async function submitEntryTestLeadAction(
  _prevState: EntryTestLeadState,
  formData: FormData
): Promise<EntryTestLeadState> {
  // Form công khai — giới hạn độ dài mọi trường trước khi lưu DB.
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  const phone = String(formData.get("phone") ?? "").replace(/[\s.-]/g, "").slice(0, 20);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(formData.get("password") ?? "");
  const target = String(formData.get("target") ?? "").trim().slice(0, 20);
  const goal = String(formData.get("goal") ?? "").trim().slice(0, 50);
  const when = String(formData.get("when") ?? "Chưa xác định").trim().slice(0, 50);
  const utmSource = String(formData.get("utmSource") ?? "").trim().slice(0, 100) || undefined;
  const utmMedium = String(formData.get("utmMedium") ?? "").trim().slice(0, 100) || undefined;
  const utmCampaign = String(formData.get("utmCampaign") ?? "").trim().slice(0, 100) || undefined;

  const fieldErrors: EntryTestLeadState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = "Nhập họ và tên của bạn";
  if (!PHONE_RE.test(phone)) fieldErrors.phone = "Số điện thoại chưa đúng, ví dụ 0912 345 678";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Nhập email hợp lệ, ví dụ ban@email.com";
  if (password.length <= 8) fieldErrors.password = "Mật khẩu phải nhiều hơn 8 ký tự";
  else if (password.length > 200) fieldErrors.password = "Mật khẩu quá dài";
  if (!target) fieldErrors.target = "Chọn điểm mục tiêu";
  if (!goal) fieldErrors.goal = "Chọn mục đích thi";
  const values = { name, phone: String(formData.get("phone") ?? ""), email, target, goal, when };
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  const purposeMap: Record<string, EntryTestPurpose> = {
    "Du học": "DU_HOC",
    "Định cư": "DINH_CU",
    "Xin việc / hành nghề": "XIN_VIEC",
  };

  const existing = await findUserByEmail(email, { id: true });
  if (existing) {
    return { fieldErrors: { email: "Email này đã được đăng ký, hãy đăng nhập để làm test" }, values };
  }

  if (!(await consumeRateLimit("signupIp", await getRequestIp()))) {
    return { fieldErrors: { email: "Bạn đã đăng ký quá nhiều lần, vui lòng thử lại sau" }, values };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        examPackage: "academic",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        reservationsLeft: 2,
      },
    }),
    prisma.entryTestLead.create({
      data: {
        name,
        phone,
        email,
        targetScore: target,
        purpose: purposeMap[goal] ?? "KHAC",
        examTimeline: when,
        consentAt: new Date(),
        utmSource,
        utmMedium,
        utmCampaign,
      },
    }),
  ]);

  try {
    await signIn("credentials", { email, password, redirectTo: "/test-dau-vao" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: true };
    }
    throw error;
  }

  return { success: true };
}
