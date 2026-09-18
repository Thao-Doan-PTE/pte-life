"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ExamPackage } from "@/lib/question-types";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    throw new Error("Bạn không có quyền thực hiện thao tác này.");
  }
  return session.user;
}

export async function getAllUsersForAdmin() {
  await requireAdmin();
  return prisma.user.findMany({
    where: { role: "student" },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecentReservationLogs(limit = 20) {
  await requireAdmin();
  const logs = await prisma.reservationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  });
  return logs;
}

export async function changePackageAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string;
  const examPackage = formData.get("examPackage") as ExamPackage;

  await prisma.user.update({
    where: { id: userId },
    data: { examPackage },
  });
  await prisma.reservationLog.create({
    data: {
      userId,
      performedById: admin.id,
      action: "change_package",
      detail: `Đổi gói học sang ${examPackage === "academic" ? "PTE Academic" : "PTE Core"}`,
    },
  });
  revalidatePath("/admin");
}

export async function extendExpiryAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string;
  const days = Number(formData.get("days"));
  if (!Number.isFinite(days) || days === 0) return;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const newExpiry = new Date(user.expiresAt.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: { expiresAt: newExpiry },
  });
  await prisma.reservationLog.create({
    data: {
      userId,
      performedById: admin.id,
      action: "extend",
      detail: `Gia hạn ${days} ngày (hạn mới: ${newExpiry.toLocaleDateString("vi-VN")})`,
    },
  });
  revalidatePath("/admin");
}

const RESERVATION_EXTENSION_DAYS = 30;

export async function useReservationAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = formData.get("userId") as string;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.reservationsLeft <= 0) {
    throw new Error("Học viên đã hết lượt bảo lưu.");
  }

  const newExpiry = new Date(
    user.expiresAt.getTime() + RESERVATION_EXTENSION_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      reservationsLeft: user.reservationsLeft - 1,
      expiresAt: newExpiry,
    },
  });
  await prisma.reservationLog.create({
    data: {
      userId,
      performedById: admin.id,
      action: "reservation",
      detail: `Dùng 1 lượt bảo lưu, gia hạn ${RESERVATION_EXTENSION_DAYS} ngày (hạn mới: ${newExpiry.toLocaleDateString("vi-VN")})`,
    },
  });
  revalidatePath("/admin");
}
