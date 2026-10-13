"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { clampText } from "@/lib/practice-access";
import { assertQuestionAllowed, requireAnyPracticeAccess } from "@/lib/student-access";
import { consumeRateLimit, consumeRateLimits } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { detectAudio } from "@/lib/file-signature";
import { createAttemptWithAssignmentLink, getMockSessionAssignmentId } from "@/lib/admin/assignment-link";
import { getSpeakingGrader } from "@/lib/scoring/ai/speaking-index";
import type { SpeakingGradeResult, SpeakingTaskType } from "@/lib/scoring/ai/speaking-index";
import { toPteScore } from "@/lib/scoring/types";
import type { Prisma } from "@/lib/generated/prisma/client";

export interface SpeakingSubmitResult {
  scorePct: number;
  pteScore: number;
  correct: boolean;
  grade: SpeakingGradeResult;
  wordsPerMinute: number;
  fillerWordCount: number;
}

function getReferenceText(content: Record<string, unknown>): string | undefined {
  return (
    (content.passage as string) ??
    (content.referenceText as string) ??
    (content.transcript as string) ??
    (content.referenceAnswer as string) ??
    (content.situationText as string) ??
    undefined
  );
}

const FILLER_WORDS = /\b(um+|uh+|erm+|like|you know|ừm+|ờ+)\b/gi;

// Khớp với SpeakingTaskType — chỉ các dạng này được chấm bằng AI Speaking.
const SPEAKING_TASK_TYPES: ReadonlySet<string> = new Set<SpeakingTaskType>([
  "read-aloud",
  "repeat-sentence",
  "describe-image",
  "retell-lecture",
  "answer-short-question",
  "summarize-group-discussion",
  "respond-to-situation",
]);

// 3.5MB — 40 giây ghi âm chỉ khoảng 0.5MB; Vercel giới hạn body 4.5MB.
const MAX_AUDIO_SIZE = 3.5 * 1024 * 1024;
const AUDIO_DIR = path.join(process.cwd(), "public", "uploads", "practice-audio");

// Các hàm dưới KHÔNG export: mọi hàm export trong file "use server" đều thành endpoint HTTP.

/** Lấy file ghi âm hợp lệ từ FormData trình duyệt gửi kèm (field "audio").
 * Kiểm tra loại file thật qua nội dung (không tin file.type) và dung lượng.
 * File không hợp lệ thì bỏ qua (trả null) — không bao giờ làm hỏng việc chấm. */
async function readAudioFile(audioForm: unknown) {
  if (!(audioForm instanceof FormData)) return null;
  const file = audioForm.get("audio");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_AUDIO_SIZE) return null;
  try {
    const kind = await detectAudio(file);
    return kind ? { file, kind } : null;
  } catch {
    return null;
  }
}

/** Lưu file ghi âm để giáo viên nghe khi chấm (cùng cách lưu với ghi âm Test
 * đầu vào: Vercel Blob, hoặc public/uploads khi chạy local). Trả về URL, hoặc
 * null nếu quá giới hạn tải lên / lưu lỗi. */
async function storePracticeAudio(
  userId: string,
  attemptId: string,
  audio: NonNullable<Awaited<ReturnType<typeof readAudioFile>>>
): Promise<string | null> {
  try {
    if (!(await consumeRateLimit("practiceAudioUser", userId))) return null;
    const filename = `${attemptId}-${randomUUID()}.${audio.kind.ext}`;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`practice-audio/${filename}`, audio.file, {
        access: "public",
        contentType: audio.kind.contentType,
      });
      return blob.url;
    }
    await mkdir(AUDIO_DIR, { recursive: true });
    await writeFile(path.join(AUDIO_DIR, filename), Buffer.from(await audio.file.arrayBuffer()));
    return `/uploads/practice-audio/${filename}`;
  } catch (error) {
    console.error("[speaking] Không lưu được file ghi âm", error);
    return null;
  }
}

/** Xoá file ghi âm vừa lưu khi không ghi được audioUrl vào lượt làm bài — tránh
 * file mồ côi không ai nghe được. Lỗi khi xoá thì bỏ qua. */
async function removePracticeAudio(audioUrl: string): Promise<void> {
  if (audioUrl.startsWith("/uploads/practice-audio/")) {
    await unlink(path.join(AUDIO_DIR, path.basename(audioUrl))).catch(() => {});
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(audioUrl).catch(() => {});
  }
}

/** `audioForm` (tuỳ chọn): FormData có field "audio" = file ghi âm. Chỉ được
 * lưu khi bài nộp thuộc bài tập được giao và cần giáo viên chấm (reviewStatus
 * PENDING); các trường hợp khác bỏ qua file. Trình duyệt chỉ gửi kèm khi trang
 * báo cần ghi âm (collectAudio) — server vẫn tự quyết định, không tin cờ đó.
 * `mockSessionId` (tuỳ chọn): lượt Mock test đang làm — chỉ dùng để ưu tiên gắn
 * bài vào bài tập của lượt đó, server tự kiểm tra lượt thi thuộc học viên. */
export async function submitSpeakingAttemptAction(
  questionId: string,
  transcript: string,
  durationSeconds: number,
  pauseCount?: number,
  longestPauseMs?: number,
  audioForm?: FormData,
  mockSessionId?: string
): Promise<SpeakingSubmitResult> {
  // Người dùng thử Tủ chỉ được chấm câu RS thuộc bộ Tủ (kiểm tra sau khi tải câu).
  const { user, access } = await requireAnyPracticeAccess();
  if (typeof questionId !== "string" || questionId.length === 0 || questionId.length > 64) {
    throw new Error("Câu hỏi không hợp lệ.");
  }
  const question = await prisma.question.findUniqueOrThrow({
    where: { id: questionId },
  });
  // Endpoint công khai: chặn gửi id câu hỏi dạng khác (Reading, Writing...) để
  // không chấm nhầm bằng AI Speaking và không gắn nhầm vào bài tập được giao.
  if (!SPEAKING_TASK_TYPES.has(question.questionTypeId)) {
    throw new Error("Câu hỏi này không phải dạng Speaking.");
  }
  assertQuestionAllowed(access, question);
  const taskType = question.questionTypeId as SpeakingTaskType;

  if (!(await consumeRateLimits(["aiGradeUser", user.id], ["aiGradeUserDay", user.id]))) {
    throw new Error("Bạn đã chấm quá nhiều bài, vui lòng thử lại sau.");
  }
  // Dữ liệu từ trình duyệt — giới hạn độ dài/khoảng giá trị trước khi gửi cho AI chấm.
  transcript = clampText(transcript, 3000);
  durationSeconds = Math.min(600, Math.max(0, Number(durationSeconds) || 0));
  pauseCount = pauseCount == null ? undefined : Math.min(1000, Math.max(0, Math.round(Number(pauseCount) || 0)));
  longestPauseMs = longestPauseMs == null ? undefined : Math.min(600_000, Math.max(0, Number(longestPauseMs) || 0));

  const content = question.content as Record<string, unknown>;

  const wordCount = transcript.trim().length === 0 ? 0 : transcript.trim().split(/\s+/).length;
  const wordsPerMinute =
    durationSeconds > 0 ? Math.round((wordCount / durationSeconds) * 60) : 0;
  const fillerWordCount = (transcript.match(FILLER_WORDS) ?? []).length;

  const grader = getSpeakingGrader();
  const grade = await grader.grade({
    taskType,
    transcript,
    durationSeconds,
    wordsPerMinute,
    fillerWordCount,
    pauseCount,
    longestPauseMs,
    referenceText: getReferenceText(content),
  });

  const criteriaScores = Object.values(grade.criteria).map((c) => c.scorePct);
  const scorePct = Math.round(
    criteriaScores.reduce((sum, s) => sum + s, 0) / criteriaScores.length
  );
  const pteScore = toPteScore(scorePct);
  const correct = scorePct >= 80;

  // Chấm AI xong mới mở transaction gắn bài tập + lưu bài (không giữ khoá khi
  // chờ AI). File ghi âm lưu SAU khi commit và chỉ khi bài thật sự thành bài nộp
  // chờ giáo viên chấm — không tải file lên kho trong lúc giữ khoá, và không để
  // lại file mồ côi cho bài tự luyện.
  const preferredAssignmentId = mockSessionId
    ? await getMockSessionAssignmentId(user.id, mockSessionId, question.id)
    : null;
  const link = await createAttemptWithAssignmentLink(
    { userId: user.id, questionId: question.id, questionTypeId: question.questionTypeId, preferredAssignmentId },
    {
      scorePct,
      pteScore,
      isCorrect: correct,
      response: {
        transcript,
        durationSeconds,
        wordsPerMinute,
        fillerWordCount,
        pauseCount,
        longestPauseMs,
        grade,
      } as unknown as Prisma.InputJsonValue,
      durationSec: Math.max(0, Math.round(durationSeconds)),
    }
  );

  const audio = link.reviewStatus === "PENDING" ? await readAudioFile(audioForm) : null;
  if (audio) {
    const audioUrl = await storePracticeAudio(user.id, link.attemptId, audio);
    if (audioUrl) {
      await prisma.practiceAttempt
        .update({ where: { id: link.attemptId }, data: { audioUrl } })
        .catch(async (error) => {
          console.error("[speaking] Không lưu được audioUrl", error);
          await removePracticeAudio(audioUrl);
        });
    }
  }

  if (link.assignmentId) revalidatePath("/bai-tap");

  return { scorePct, pteScore, correct, grade, wordsPerMinute, fillerWordCount };
}
