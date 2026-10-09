import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash
        );
        if (!passwordMatches) {
          return null;
        }

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
      // Tài khoản đã bị xoá khỏi DB nhưng JWT còn hạn: trả null để phiên bị
      // huỷ và người dùng quay về trạng thái khách thay vì làm các trang lỗi 500.
      const stillExists = token.sub
        ? await prisma.user.findUnique({ where: { id: token.sub }, select: { id: true } })
        : null;
      return stillExists ? token : null;
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
