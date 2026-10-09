import { requireClassStudent } from "@/lib/require-class-student";

export default async function MocktestLayout({ children }: { children: React.ReactNode }) {
  await requireClassStudent();
  return children;
}
