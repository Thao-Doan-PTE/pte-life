import type { ExamPackage } from "@/lib/question-types";
import type { Role } from "@/lib/generated/prisma/enums";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    roles: Role[];
    examPackage: ExamPackage;
    expiresAt: string;
    reservationsLeft: number;
  }

  interface Session {
    user: {
      id: string;
      roles: Role[];
      examPackage: ExamPackage;
      expiresAt: string;
      reservationsLeft: number;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    roles: Role[];
    examPackage: ExamPackage;
    expiresAt: string;
    reservationsLeft: number;
  }
}
