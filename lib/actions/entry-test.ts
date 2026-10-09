"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
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
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/[\s.-]/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const target = String(formData.get("target") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const when = String(formData.get("when") ?? "Chưa xác định").trim();
  const utmSource = String(formData.get("utmSource") ?? "").trim() || undefined;
  const utmMedium = String(formData.get("utmMedium") ?? "").trim() || undefined;
  const utmCampaign = String(formData.get("utmCampaign") ?? "").trim() || undefined;

  const fieldErrors: EntryTestLeadState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = "Nhập họ và tên của bạn";
  if (!PHONE_RE.test(phone)) fieldErrors.phone = "Số điện thoại chưa đúng, ví dụ 0912 345 678";
  if (!EMAIL_RE.test(email)) fieldErrors.email = "Nhập email hợp lệ, ví dụ ban@email.com";
  if (password.length <= 8) fieldErrors.password = "Mật khẩu phải nhiều hơn 8 ký tự";
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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "Email này đã được đăng ký, hãy đăng nhập để làm test" }, values };
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
