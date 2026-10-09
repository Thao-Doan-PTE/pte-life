"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENTRY_TEST_SECTIONS, getAllEntryTestQuestions } from "@/lib/entry-test-data";
import { gradeEntryTestAttempt, gradeEntryTestQuestion, type EntryTestGradeSummary } from "@/lib/entry-test-grading";

const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
const AUDIO_DIR = path.join(process.cwd(), "public", "uploads", "entry-test-audio");

/** Lượt làm bài đang dở (IN_PROGRESS) gần nhất, hoặc tạo mới nếu chưa có. */
export async function getOrCreateEntryTestAttempt(): Promise<{ id: string; status: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Bạn cần đăng nhập." };

  const existing = await prisma.entryTestAttempt.findFirst({
    where: { userId: session.user.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });
  if (existing) return { id: existing.id, status: existing.status };

  const created = await prisma.entryTestAttempt.create({
    data: { userId: session.user.id },
  });
  return { id: created.id, status: created.status };
}

/** Tạo lượt làm mới (cho học viên "Làm lại" test sau khi đã có kết quả). */
export async function startNewEntryTestAttempt(): Promise<{ id: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Bạn cần đăng nhập." };

  const created = await prisma.entryTestAttempt.create({ data: { userId: session.user.id } });
  revalidatePath("/test-dau-vao");
  return { id: created.id };
}

export interface UploadEntryTestAudioResult {
  ok: boolean;
  error?: string;
  audioUrl?: string;
}

/** Lưu file ghi âm Speaking (S1), ghi đè nếu đã ghi âm trước đó trong cùng lượt làm. */
export async function uploadEntryTestAudioAction(attemptId: string, formData: FormData): Promise<UploadEntryTestAudioResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Bạn cần đăng nhập." };

  const attempt = await prisma.entryTestAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== session.user.id) return { ok: false, error: "Không tìm thấy lượt làm bài." };

  const file = formData.get("audio");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Vui lòng chọn 1 file ghi âm." };
  if (file.size > MAX_AUDIO_SIZE) return { ok: false, error: "File ghi âm quá lớn (tối đa 10MB)." };

  const ext = file.type.includes("mp3") || file.type.includes("mpeg") ? "mp3" : file.type.includes("wav") ? "wav" : "webm";
  const filename = `${attemptId}-S1-${randomUUID()}.${ext}`;

  let audioUrl: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`entry-test-audio/${filename}`, file, { access: "public" });
    audioUrl = blob.url;
  } else {
    await mkdir(AUDIO_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(AUDIO_DIR, filename), buffer);
    audioUrl = `/uploads/entry-test-audio/${filename}`;
  }

  await prisma.entryTestAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId: "S1" } },
    create: { attemptId, questionId: "S1", audioUrl },
    update: { audioUrl },
  });

  return { ok: true, audioUrl };
}

export interface SubmitEntryTestResult {
  ok: boolean;
  error?: string;
  summary?: EntryTestGradeSummary;
}

/** Nộp bài: lưu toàn bộ câu trả lời, tự chấm phần đã có đáp án, cập nhật trạng thái lượt làm. */
export async function submitEntryTestAttemptAction(
  attemptId: string,
  responses: Record<string, string>,
  autoSubmitted: boolean
): Promise<SubmitEntryTestResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Bạn cần đăng nhập." };

  const attempt = await prisma.entryTestAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== session.user.id) return { ok: false, error: "Không tìm thấy lượt làm bài." };
  if (attempt.status !== "IN_PROGRESS") return { ok: false, error: "Lượt làm bài này đã được nộp." };

  const questions = getAllEntryTestQuestions();
  await prisma.$transaction(
    questions
      .filter((q) => q.type !== "read_aloud")
      .map((q) => {
        const responseText = responses[q.id] ?? "";
        const score = gradeEntryTestQuestion(q, responseText);
        return prisma.entryTestAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: q.id } },
          create: { attemptId, questionId: q.id, responseText, isCorrect: score == null ? null : score > 0, pointsAwarded: score },
          update: { responseText, isCorrect: score == null ? null : score > 0, pointsAwarded: score },
        });
      })
  );

  const summary = gradeEntryTestAttempt(ENTRY_TEST_SECTIONS, responses);

  await prisma.entryTestAttempt.update({
    where: { id: attemptId },
    data: {
      submittedAt: new Date(),
      autoSubmitted,
      scoreAuto: summary.scoreAuto,
      scoreTotal: summary.scoreAuto,
      level: summary.level,
      status: "SUBMITTED",
    },
  });

  revalidatePath("/test-dau-vao");
  return { ok: true, summary };
}
