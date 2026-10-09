import { prisma } from "@/lib/prisma";

export function getSavedWords(userId: string) {
  return prisma.savedWord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
