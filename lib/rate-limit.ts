import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Giới hạn cho từng thao tác nhạy cảm: tối đa khoảng `limit` lần trong `windowMs`. */
export const RATE_LIMITS = {
  // Đăng nhập sai — tính theo email (chống dò mật khẩu 1 tài khoản) và theo IP
  // (chống dò nhiều tài khoản từ 1 máy). Ngưỡng IP để rộng vì cả lớp/trung tâm
  // có thể dùng chung 1 IP wifi.
  loginFailEmail: { limit: 10, windowMs: 15 * MINUTE },
  loginFailIp: { limit: 100, windowMs: 15 * MINUTE },
  // Cặp (email, IP) từng đăng nhập thành công gần đây = "máy quen" của chủ tài
  // khoản; được phép thử đăng nhập cả khi email đang bị khoá tạm (xem auth.ts).
  loginOkPair: { limit: Number.MAX_SAFE_INTEGER, windowMs: 30 * DAY },
  // Tạo tài khoản (trang đăng ký + form Test đầu vào) — chống spam tài khoản.
  // Để rộng cho buổi test đầu vào tập trung tại trung tâm (chung 1 IP).
  signupIp: { limit: 100, windowMs: HOUR },
  // Chấm điểm bằng AI (Speaking/Writing) — mỗi lượt chấm tốn phí API. Đủ cho
  // học viên luyện RS liên tục cả buổi hoặc làm trọn bộ Mock test Đề Tủ.
  aiGradeUser: { limit: 200, windowMs: HOUR },
  aiGradeUserDay: { limit: 800, windowMs: DAY },
  // Tạo giọng đọc Azure (tính phí theo ký tự) — câu đã đọc rồi lấy từ cache, không tính.
  ttsUser: { limit: 300, windowMs: HOUR },
  // Đặt lịch tư vấn / học thử.
  consultationUser: { limit: 5, windowMs: DAY },
  // Upload file (ảnh đại diện, ghi âm Test đầu vào).
  uploadUser: { limit: 20, windowMs: HOUR },
} as const;

type RateLimitName = keyof typeof RATE_LIMITS;

/** Phiếu đã lấy 1 suất — giữ lại để trả suất (ví dụ đăng nhập đúng thì không tính là lần sai). */
export interface RateLimitTicket {
  /** false nếu đã chạm giới hạn (khi đó suất vừa lấy đã được trả lại ngay). */
  allowed: boolean;
  key: string;
  windowStart: Date;
  /** false khi bộ đếm chưa sẵn sàng (chưa chạy migration) — không có gì để trả. */
  counted: boolean;
}

function windowOf(name: RateLimitName, now = Date.now()) {
  const { windowMs } = RATE_LIMITS[name];
  const start = Math.floor(now / windowMs) * windowMs;
  return {
    windowStart: new Date(start),
    previousStart: new Date(start - windowMs),
    expiresAt: new Date(start + 2 * windowMs),
    elapsedFraction: (now - start) / windowMs,
  };
}

function fullKey(name: RateLimitName, key: string): string {
  return `${name}:${key}`;
}

// Chỉ bỏ qua giới hạn khi bảng bộ đếm chưa tồn tại (deploy code mới trước khi
// chạy `prisma migrate deploy`) — để học viên vẫn đăng nhập/nộp bài được.
// Mọi lỗi khác (mất kết nối, quá tải…) ném ra như bình thường, không bao giờ
// biến thành "cho qua" — nếu không kẻ tấn công chỉ cần làm quá tải là vượt giới hạn.
function isMissingTable(error: unknown): boolean {
  const text = `${(error as { message?: string })?.message ?? ""} ${JSON.stringify((error as { meta?: unknown })?.meta ?? "")}`;
  return /42P01|RateLimitCounter.*does not exist|does not exist.*RateLimitCounter/i.test(text);
}

let warnedMissingTable = false;
function warnMissingTable(error: unknown) {
  if (warnedMissingTable) return;
  warnedMissingTable = true;
  console.error("[rate-limit] Chưa có bảng RateLimitCounter — chạy `prisma migrate deploy`. Tạm bỏ qua giới hạn.", error);
}

async function increment(key: string, windowStart: Date, expiresAt: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitCounter" ("key", "windowStart", "expiresAt", "count")
    VALUES (${key}, ${windowStart}, ${expiresAt}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimitCounter"."count" + 1
    RETURNING "count"`;
  return Number(rows[0]?.count ?? 1);
}

async function readCount(key: string, windowStart: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    SELECT "count" FROM "RateLimitCounter" WHERE "key" = ${key} AND "windowStart" = ${windowStart}`;
  return Number(rows[0]?.count ?? 0);
}

async function decrement(key: string, windowStart: Date): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "RateLimitCounter" SET "count" = GREATEST("count" - 1, 0)
    WHERE "key" = ${key} AND "windowStart" = ${windowStart}`;
}

/** Lấy 1 suất: tăng bộ đếm bằng 1 câu lệnh nguyên tử rồi so với giới hạn (ước
 * lượng "cửa sổ trượt" = khung hiện tại + phần còn hiệu lực của khung trước).
 * Chạm giới hạn thì trả lại suất ngay và báo allowed=false. */
export async function takeRateLimit(name: RateLimitName, key: string): Promise<RateLimitTicket> {
  const k = fullKey(name, key);
  const { windowStart, previousStart, expiresAt, elapsedFraction } = windowOf(name);
  try {
    const current = await increment(k, windowStart, expiresAt);
    const previous = await readCount(k, previousStart);
    const estimate = current + previous * (1 - elapsedFraction);
    if (estimate > RATE_LIMITS[name].limit) {
      await decrement(k, windowStart);
      return { allowed: false, key: k, windowStart, counted: false };
    }
    // Thỉnh thoảng dọn các khung đã hết hạn để bảng không phình to.
    if (Math.random() < 0.01) {
      await prisma.$executeRaw`DELETE FROM "RateLimitCounter" WHERE "expiresAt" < ${new Date()}`.catch(() => {});
    }
    return { allowed: true, key: k, windowStart, counted: true };
  } catch (error) {
    if (isMissingTable(error)) {
      warnMissingTable(error);
      return { allowed: true, key: k, windowStart, counted: false };
    }
    throw error;
  }
}

/** Trả lại suất đã lấy (bỏ qua phiếu không được tính). */
export async function releaseRateLimit(...tickets: (RateLimitTicket | null | undefined)[]): Promise<void> {
  for (const t of tickets) {
    if (!t?.counted) continue;
    await decrement(t.key, t.windowStart).catch((error) => {
      console.error("[rate-limit] Không trả được suất:", error);
    });
  }
}

/** Ghi 1 lượt, không so giới hạn. */
export async function recordRateLimitHit(name: RateLimitName, key: string): Promise<void> {
  const { windowStart, expiresAt } = windowOf(name);
  try {
    await increment(fullKey(name, key), windowStart, expiresAt);
  } catch (error) {
    if (isMissingTable(error)) return warnMissingTable(error);
    throw error;
  }
}

/** Có lượt nào của `key` trong khung hiện tại hoặc khung trước không. */
export async function hasRecentRateLimitHit(name: RateLimitName, key: string): Promise<boolean> {
  const k = fullKey(name, key);
  const { windowStart, previousStart } = windowOf(name);
  try {
    return (await readCount(k, windowStart)) + (await readCount(k, previousStart)) > 0;
  } catch (error) {
    if (isMissingTable(error)) {
      warnMissingTable(error);
      return false;
    }
    throw error;
  }
}

/** Lấy 1 suất nếu còn hạn mức. Trả về false nếu đã chạm giới hạn. */
export async function consumeRateLimit(name: RateLimitName, key: string): Promise<boolean> {
  return (await takeRateLimit(name, key)).allowed;
}

/** Lấy suất ở nhiều giới hạn cùng lúc (ví dụ theo giờ + theo ngày): chỉ cần 1
 * giới hạn chạm ngưỡng là trả lại hết các suất đã lấy và báo false. */
export async function consumeRateLimits(...limits: [RateLimitName, string][]): Promise<boolean> {
  const taken: RateLimitTicket[] = [];
  for (const [name, key] of limits) {
    const ticket = await takeRateLimit(name, key);
    if (!ticket.allowed) {
      await releaseRateLimit(...taken);
      return false;
    }
    taken.push(ticket);
  }
  return true;
}

/** IP của người gửi request, lấy từ header do Vercel/proxy gắn vào. */
export function getIpFromHeaders(h: Headers): string {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

/** IP của request hiện tại — dùng trong server action / server component. */
export async function getRequestIp(): Promise<string> {
  return getIpFromHeaders(await headers());
}
