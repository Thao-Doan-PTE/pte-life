"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CONSULTATION_TIME_SLOTS } from "@/lib/consultation-slots";

const PHONE_RE = /^(0|\+84)[35789]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConsultationState {
  success?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "date" | "timeSlot", string>>;
  values?: Partial<Record<"name" | "phone" | "email" | "date" | "timeSlot" | "note", string>>;
}

export async function submitConsultationRequestAction(
  _prev: ConsultationState,
  formData: FormData
): Promise<ConsultationState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Bạn cần đăng nhập để đặt lịch tư vấn." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/[\s.-]/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const date = String(formData.get("date") ?? "").trim();
  const timeSlot = String(formData.get("timeSlot") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const topic = formData.get("topic") === "trial" ? "trial" : "consult";
  const values = { name, phone: String(formData.get("phone") ?? ""), email, date, timeSlot, note };

  const fieldErrors: ConsultationState["fieldErrors"] = {};
  if (name.length < 2) fieldErrors.name = "Nhập họ và tên của bạn";
  if (!PHONE_RE.test(phone)) fieldErrors.phone = "Số điện thoại chưa đúng, ví dụ 0912 345 678";
  if (email && !EMAIL_RE.test(email)) fieldErrors.email = "Email chưa hợp lệ";

  // Lưu ở 12:00 UTC để phần ngày không bị lệch theo múi giờ khi đọc lại.
  const preferred = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00Z`) : null;
  const now = new Date();
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (!preferred || Number.isNaN(preferred.getTime())) fieldErrors.date = "Chọn ngày hẹn";
  else if (date < todayLocal) fieldErrors.date = "Ngày hẹn không được ở quá khứ";
  if (!(CONSULTATION_TIME_SLOTS as readonly string[]).includes(timeSlot)) fieldErrors.timeSlot = "Chọn khung giờ";

  if (Object.keys(fieldErrors).length > 0 || !preferred) return { fieldErrors, values };

  await prisma.consultationRequest.create({
    data: {
      userId: session.user.id,
      name,
      phone,
      email: email || null,
      preferredDate: preferred,
      timeSlot,
      note: note || null,
      topic,
    },
  });

  return { success: true };
}
