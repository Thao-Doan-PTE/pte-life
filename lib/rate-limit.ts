import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Giới hạn cho từng thao tác nhạy cảm: tối đa `limit` lần trong `windowMs`. */
export const RATE_LIMITS = {
  // Đăng nhập sai — tính theo email (chống dò mật khẩu 1 tài khoản) và theo IP
  // (chống dò nhiều tài khoản từ 1 máy). Ngưỡng IP để rộng vì cả lớp/trung tâm
  // có thể dùng chung 1 IP wifi.
  loginFailEmail: { limit: 10, windowMs: 15 * MINUTE },
  loginFailIp: { limit: 100, windowMs: 15 * MINUTE },
  // Đăng nhập sai theo cặp (email, IP) — để biết máy đang đăng nhập có phải
  // máy đã dò sai email này không (xem auth.ts).
  loginFailPair: { limit: 1, windowMs: 15 * MINUTE },
  // Tạo tài khoản (trang đăng ký + form Test đầu vào) — chống spam tài khoản.
  // Để rộng cho buổi test đầu vào tập trung tại trung tâm (chung 1 IP).
  signupIp: { limit: 100, windowMs: HOUR },
  // Chấm điểm bằng AI (Speaking/Writing) — mỗi lượt chấm tốn phí API. Đủ cho
  // học viên luyện RS liên tục cả buổi hoặc làm trọn bộ Mock test Đề Tủ.
  aiGradeUser: { limit: 200, windowMs: HOUR },
  aiGradeUserDay: { limit: 800, windowMs: 24 * HOUR },
  // Tạo giọng đọc Azure (tính phí theo ký tự) — câu đã đọc rồi lấy từ cache, không tính.
  ttsUser: { limit: 300, windowMs: HOUR },
  // Đặt lịch tư vấn / học thử.
  consultationUser: { limit: 5, windowMs: 24 * HOUR },
  // Upload file (ảnh đại diện, ghi âm Test đầu vào).
  uploadUser: { limit: 20, windowMs: HOUR },
} as const;

type RateLimitName = keyof typeof RATE_LIMITS;

// Lỗi DB ở bộ đếm (ví dụ deploy code mới trước khi chạy `prisma migrate deploy`
// nên chưa có bảng RateLimitHit) không được làm hỏng đăng nhập/nộp bài của học
// viên: ghi log rồi cho qua — mất tạm lớp chống spam còn hơn khoá cả hệ thống.

function fullKey(name: RateLimitName, key: string): string {
  return `${name}:${key}`;
}

/** Số lượt của `key` trong khung thời gian của giới hạn `name` (0 nếu lỗi DB). */
export async function countRateLimitHits(name: RateLimitName, key: string): Promise<number> {
  try {
    return await prisma.rateLimitHit.count({
      where: { key: fullKey(name, key), createdAt: { gte: new Date(Date.now() - RATE_LIMITS[name].windowMs) } },
    });
  } catch (error) {
    console.error("[rate-limit] Không đọc được bộ đếm, tạm bỏ qua giới hạn:", error);
    return 0;
  }
}

export interface RateLimitTicket {
  /** false nếu đã chạm giới hạn (khi đó không ghi thêm lượt). */
  allowed: boolean;
  /** id lượt vừa ghi — để huỷ lượt đó sau (ví dụ đăng nhập đúng thì không tính là lần sai). */
  hitId: string | null;
}

/** Kiểm tra + ghi 1 lượt trong cùng 1 transaction có khoá theo key, để nhiều
 * request song song không cùng lọt qua khi chỉ còn 1 suất. */
export async function takeRateLimit(name: RateLimitName, key: string): Promise<RateLimitTicket> {
  const k = fullKey(name, key);
  const { limit, windowMs } = RATE_LIMITS[name];
  try {
    const ticket = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${k}))`;
      const count = await tx.rateLimitHit.count({
        where: { key: k, createdAt: { gte: new Date(Date.now() - windowMs) } },
      });
      if (count >= limit) return { allowed: false, hitId: null };
      const hit = await tx.rateLimitHit.create({ data: { key: k }, select: { id: true } });
      return { allowed: true, hitId: hit.id };
    });
    // Thỉnh thoảng dọn các lượt đã quá 1 ngày để bảng không phình to.
    if (Math.random() < 0.02) {
      await prisma.rateLimitHit
        .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * HOUR) } } })
        .catch(() => {});
    }
    return ticket;
  } catch (error) {
    console.error("[rate-limit] Không dùng được bộ đếm, tạm bỏ qua giới hạn:", error);
    return { allowed: true, hitId: null };
  }
}

/** Huỷ các lượt đã ghi (bỏ qua id null). */
export async function releaseRateLimitHits(hitIds: (string | null)[]): Promise<void> {
  const ids = hitIds.filter((id): id is string => !!id);
  if (ids.length === 0) return;
  await prisma.rateLimitHit.deleteMany({ where: { id: { in: ids } } }).catch((error) => {
    console.error("[rate-limit] Không huỷ được lượt:", error);
  });
}

/** Ghi 1 lượt, không kiểm tra giới hạn. */
export async function recordRateLimitHit(name: RateLimitName, key: string): Promise<void> {
  await prisma.rateLimitHit.create({ data: { key: fullKey(name, key) } }).catch((error) => {
    console.error("[rate-limit] Không ghi được bộ đếm:", error);
  });
}

/** Lấy 1 suất nếu còn hạn mức. Trả về false nếu đã chạm giới hạn. */
export async function consumeRateLimit(name: RateLimitName, key: string): Promise<boolean> {
  return (await takeRateLimit(name, key)).allowed;
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
