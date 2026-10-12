import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  countRateLimitHits,
  getIpFromHeaders,
  recordRateLimitHit,
  releaseRateLimitHits,
  takeRateLimit,
} from "@/lib/rate-limit";
import { findUserByEmail, normalizeEmail } from "@/lib/user-email";

/** Đăng nhập bị chặn tạm thời vì đoán sai quá nhiều lần. */
export class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}

/** Tài khoản bị admin khoá (INACTIVE). */
export class AccountLockedSignin extends CredentialsSignin {
  code = "account_locked";
}

// So mật khẩu với 1 hash giả khi email không tồn tại, để thời gian phản hồi như
// nhau — không đoán được email nào đã có tài khoản qua tốc độ trả lời.
const DUMMY_PASSWORD_HASH = "$2b$10$/rQASHSMEqw7Vnv7G4ugKeyD2k4kM0oWpE8/xRDgEs7wrL0mK1r2W";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: async (credentials, request) => {
        const rawEmail = credentials?.email;
        const password = credentials?.password;
        if (typeof rawEmail !== "string" || typeof password !== "string" || password.length > 200) {
          return null;
        }
        const email = normalizeEmail(rawEmail).slice(0, 200);
        const ip = getIpFromHeaders(request.headers);
        const pairKey = `${email}|${ip}`;

        // Mỗi lần thử giữ trước 1 suất "đăng nhập sai" theo IP và theo email;
        // đăng nhập đúng thì trả lại suất. Giữ trước (thay vì chỉ ghi khi sai)
        // để gửi hàng loạt request song song cũng không vượt được giới hạn.
        const ipTicket = await takeRateLimit("loginFailIp", ip);
        if (!ipTicket.allowed) throw new RateLimitedSignin();
        const emailTicket = await takeRateLimit("loginFailEmail", email);

        const user = await findUserByEmail(email, {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          status: true,
          roles: true,
          examPackage: true,
          expiresAt: true,
          reservationsLeft: true,
        });
        const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

        if (!user || !passwordMatches) {
          await recordRateLimitHit("loginFailPair", pairKey);
          if (!emailTicket.allowed) throw new RateLimitedSignin();
          return null;
        }

        // Email đang bị khoá tạm vì có người đoán sai nhiều lần: vẫn cho chủ tài
        // khoản vào nếu máy này (IP này) chưa từng đoán sai email này — để người
        // khác không thể cố tình nhập sai liên tục mà khoá tài khoản học viên.
        if (!emailTicket.allowed && (await countRateLimitHits("loginFailPair", pairKey)) > 0) {
          throw new RateLimitedSignin();
        }
        await releaseRateLimitHits([ipTicket.hitId, emailTicket.hitId]);

        // Tài khoản bị admin khoá (INACTIVE) không được đăng nhập.
        if (user.status !== "ACTIVE") throw new AccountLockedSignin();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles,
          examPackage: user.examPackage,
          expiresAt: user.expiresAt.toISOString(),
          reservationsLeft: user.reservationsLeft,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
        token.examPackage = user.examPackage;
        token.expiresAt = user.expiresAt;
        token.reservationsLeft = user.reservationsLeft;
        return token;
      }
      // Mỗi request đọc lại user từ DB: tài khoản đã bị xoá hoặc bị khoá thì huỷ
      // phiên ngay (về trạng thái khách); role/gói học thay đổi thì có hiệu lực
      // luôn, không phải đợi JWT hết hạn mới mất quyền.
      const current = token.sub
        ? await prisma.user.findUnique({
            where: { id: token.sub },
            select: { status: true, roles: true, examPackage: true, expiresAt: true, reservationsLeft: true },
          })
        : null;
      if (!current || current.status !== "ACTIVE") return null;
      token.roles = current.roles;
      token.examPackage = current.examPackage;
      token.expiresAt = current.expiresAt.toISOString();
      token.reservationsLeft = current.reservationsLeft;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.roles = token.roles;
      session.user.examPackage = token.examPackage;
      session.user.expiresAt = token.expiresAt;
      session.user.reservationsLeft = token.reservationsLeft;
      return session;
    },
  },
});
