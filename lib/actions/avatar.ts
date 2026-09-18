"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

export interface UploadAvatarResult {
  ok: boolean;
  error?: string;
  avatarUrl?: string;
}

export async function uploadAvatarAction(formData: FormData): Promise<UploadAvatarResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Vui lòng chọn 1 ảnh." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: "Ảnh quá lớn (tối đa 3MB)." };
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return { ok: false, error: "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP." };
  }

  await mkdir(AVATAR_DIR, { recursive: true });

  const userId = session.user.id;
  const filename = `${userId}-${randomUUID()}.${ext}`;
  const filePath = path.join(AVATAR_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const previous = await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
  const avatarUrl = `/uploads/avatars/${filename}`;
  await prisma.user.update({ where: { id: userId }, data: { avatarUrl } });

  if (previous?.avatarUrl?.startsWith("/uploads/avatars/")) {
    const oldPath = path.join(process.cwd(), "public", previous.avatarUrl);
    await unlink(oldPath).catch(() => {});
  }

  revalidatePath("/");
  return { ok: true, avatarUrl };
}
