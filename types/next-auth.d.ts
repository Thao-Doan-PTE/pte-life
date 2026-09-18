import type { ExamPackage } from "@/lib/question-types";
import type { DefaultSession } from "next-auth";

export type UserRole = "student" | "admin";

declare module "next-auth" {
  interface User {
    role: UserRole;
    examPackage: ExamPackage;
    expiresAt: string;
    reservationsLeft: number;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      examPackage: ExamPackage;
      expiresAt: string;
      reservationsLeft: number;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    examPackage: ExamPackage;
    expiresAt: string;
    reservationsLeft: number;
  }
}
